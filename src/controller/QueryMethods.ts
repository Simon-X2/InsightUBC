import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError, ResultTooLargeError,
} from "./IInsightFacade";
import Section from "./Section";
import {
	Filter,
	Query,
	QueryOptions,
	LogicComparison,
	MCOMPARISON,
	SCOMPARISON,
	TransformationOptions, SortTypes, DirectionObject
} from "./QueryInterfaces";
import * as regexpp from "regexpp";
import {RoomQueryMethods} from "./RoomQueryMethods";
import Room from "./Room";
import {WildcardsMethods} from "./WildcardsMethods"; // add {} if Section is an interface

export class QueryMethods {
	public roomQueryMethods = new RoomQueryMethods();
	private wildcardMethods = new WildcardsMethods();
	public nameOfDataset: string = "";
	public courses: any[] = [];
	public resultArray: any[] = [];


	/**
	 * Validate that OPTIONS contains COLUMNS as a string array, and if ORDER exists that it is type string.
	 * If ORDER is empty, then it is assigned undefined
	 * NOTE: does not check if contents of COLUMNS and ORDER follow EBNF
	 **/

	// keeps a  course when doAndOrNot returns true
	public filterAllGivenCourses(filter: Filter): Section[] {
		try{
			this.resultArray = this.courses.filter((section) => this.doAndOrNot(section, filter));
			return this.resultArray;
		} catch(err){
			throw new InsightError(`Filter ${err}`);
		}
	}

	// if keywords AND OR NOT present, then break them down along recursive path, eventually do a different comparison
	public doAndOrNot(course: Section | Room, filterType: Filter): boolean {
		// todo: course parameter has to change to handle both sections and rooms
		try {
			let status: boolean = false;
			// check for negation and if negation exists, then do this whole method again but with !
			if ((filterType as LogicComparison).AND) {
				let filterList = filterType as LogicComparison;
				if(filterList.AND.length < 1){
					throw new InsightError("And filter list less than 1 size");
				}
				return filterList.AND.every((sub) => this.doAndOrNot(course, sub));
			} else if ((filterType as LogicComparison).OR) {
				let filterList = filterType as LogicComparison;
				if(filterList.OR.length < 1){
					throw new InsightError("OR filter list less than 1 size");
				}
				return filterList.OR.some((sub) => this.doAndOrNot(course, sub));
			} else if ((filterType as LogicComparison).NOT) {
				let filter = filterType as LogicComparison;
				return !this.doAndOrNot(course, filter.NOT);
			} else {
				status = this.parseAndValidateWhere(filterType, course);
				return status;
			}
		} catch (e) {
			throw new InsightError(`Do or do not Error: ${e}`);
		}
	}

	public parseAndValidateOptions(options: QueryOptions): QueryOptions {
		// missing columns
		// more than just columns and order
		// got this from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
		let options1: QueryOptions; //
		if (!Object.prototype.hasOwnProperty.call(options, "COLUMNS") || Object.keys(options).length > 2) {
			throw new InsightError("invalid options");
		}

		// stuff to set the name of dataset for future use
		const nameOfDataset = Object.values(options)[0][0].split("_")[0];
		if (this.nameOfDataset === "") {
			this.setNameOfDataset(nameOfDataset);
		}

		// check if query is type rooms or sections. Assign OPTIONS based upon query type
		// if(this.roomQueryMethods.queryIsTypeRoomsVar){
		// 	// query is of type rooms, so assign options for rooms type query
		// 	options1 = this.roomQueryMethods.assignRoomsOptions(options);
		// } else {
		// query is of type sections, so assign options for sections type query
		// stuff to assign columns and order as a sections type query
		options1 = {
			COLUMNS: Object.values(options)[0],
			ORDER: undefined,
			// TODO: SORT instead of ORDER
		};
		if (options.ORDER !== undefined) { // TODO: parse SORT instead of ORDER
			// // order exists so we assign order
			if (typeof (options.ORDER) === "string") {
				(options1.ORDER as SortTypes) = options.ORDER as string;
			} else {
				(options1.ORDER as SortTypes) = options.ORDER as DirectionObject;
				if((options1.ORDER as DirectionObject).dir !== "UP" &&
					(options1.ORDER as DirectionObject).dir !== "DOWN"){
					throw new InsightError("Invalid direction key" + (options1.ORDER as DirectionObject).dir);
				}
			}
		}
	// }
		return options1;
	}

	public parseAndValidateWhere(filterType: Filter, course: Section | Room): boolean {
		let status: boolean = false;
		// Check that WHERE block is of type object
		if (typeof filterType !== "object" || filterType === null || Array.isArray(filterType)) {
			throw new InsightError("WHERE block must be an object type");
		}
		// validate based upon filter type. math, string, logic, negation
		// logic for math comparison
		// check for GT, LT, EQ
		{
			if (
				Object.prototype.hasOwnProperty.call(filterType, "GT") ||
				Object.prototype.hasOwnProperty.call(filterType, "LT") ||
				Object.prototype.hasOwnProperty.call(filterType, "EQ")
			) {
				status = this.parseAndValidateMComparator(filterType, course);
			} else if (Object.prototype.hasOwnProperty.call(filterType, "IS")) {
				status = this.parseAndValidateSComparator(filterType, course);
			}
		}
		return status;
		// placeholder
	}

	// private validateLogicComparison(logicComparison: unknown): void {
	// 	if (!Array.isArray(logicComparison)) {
	// 		throw new InsightError("Logic comparison must be an array.");
	// 	}
	// 	// Check if logicComparison contains at least one filter
	// 	if (logicComparison.length < 1) {
	// 		throw new InsightError("Logic comparison must contain at least one filter.");
	// 	}
	// 	// Validate each filter within logicComparison
	// 	for (const filter of logicComparison) {
	// 		this.parseAndValidateWhere(filter);
	// 	}
	// }

	private parseAndValidateMComparator(mathFilter: Filter, course: Section | Room): boolean {
		// Using Object.keys to return array of string-keyed name for object called
		const MComparator: string = Object.keys(mathFilter)[0]; // gets LT, GT, or EQ getting first element which should be the MComparator interface
		const mkey: string = Object.values(mathFilter)[0]; // gets mkey
		const idstring: string = Object.keys(mkey)[0].split("_")[0]; // splits mkey along _ and takes lefthand side which is idstring
		const mfield: string = Object.keys(mkey)[0].split("_")[1]; // gets mfield portion
		const comparisonValue = Object.values(mkey)[0]; // gets the number for comparison
		this.setNameOfDataset(idstring);
		let status: boolean = false;
		// check valid mfields based upon if query is rooms or sections type
		if(this.roomQueryMethods.queryIsTypeRoomsVar) {
			if(this.roomQueryMethods.checkRoomsMfieldValid(mfield)) {
				status = this.performMathComparison(course, MComparator, mfield, comparisonValue as unknown as number);
				return status;
			} else {
				throw new InsightError("mfield not valid for type rooms" + mfield);
			}
		} else { // query of type sections
			if(this.checkMfieldValid(mfield)) {
				status = this.performMathComparison(course, MComparator, mfield, comparisonValue as unknown as number);
				return status;
			} else {
				throw new InsightError("mfield is not valid");
			}
		}
	}

	// this method sets the global variable for nameOfDataset, which is used for applying idstring to dataset fields
	public setNameOfDataset(name: string): void {
		if (this.nameOfDataset !== "" && this.nameOfDataset !== name) {
			throw new InsightError("A dataset is already in use");
		} else {
			this.nameOfDataset = name;
		}
	}

	// hello simon was here
	public checkMfieldValid(mfield: string): boolean {
		return mfield === "id" ||
			mfield === "year" ||
			mfield === "avg" ||
			mfield === "pass" ||
			mfield === "fail" ||
			mfield === "audit";
	}

	private performMathComparison(course: Section | Room, MComp: string, mfield: string, compValue: number): boolean {
		let bool = false;
		if(typeof course[mfield] === "string"){
			throw new InsightError("MathComp: trying to use string in math comparison");
		}
		if (MComp === "GT") {
			bool = course[mfield] > compValue;
		} else if (MComp === "LT") {
			bool = course[mfield] < compValue;
		} else if (MComp === "EQ") {
			bool = course[mfield] === compValue;
		}

		return bool;
	}

	private parseAndValidateSComparator(stringFilter: Filter, course: Section | Room): boolean {
		// Using Object.keys to return array of string-keyed name for object called
		const SComparator: string = Object.keys(stringFilter)[0]; // gets IS
		const skey: string = Object.values(stringFilter)[0]; // gets skey
		const idstring: string = Object.keys(skey)[0].split("_")[0]; // splits skey along _ and takes lefthand side which is idstring
		const sfield: string = Object.keys(skey)[0].split("_")[1]; // gets sfield portion
		const comparisonValue: string = Object.values(skey)[0]; // gets the string for comparison
		// set name of dataset lmao
		this.setNameOfDataset(idstring);
		let bool = false;

		if(this.roomQueryMethods.queryIsTypeRoomsVar) {
			if(this.roomQueryMethods.checkRoomsSfieldValid(sfield)) {
				if(comparisonValue.includes("*") ){ // && SComparator === "IS"
					bool = this.wildcardMethods.doWildcards(SComparator, sfield, comparisonValue as string, course);
				} else{
					bool = this.performStringComparison(course, SComparator, sfield,
						comparisonValue as unknown as string);
				}
			}else {
				throw new InsightError("sfield is not valid for type rooms" + sfield);
			}
		}else { // query is of type sections
			if (this.checkSfieldValid(sfield)) {
				if(comparisonValue.includes("*") ){ // && SComparator === "IS"
					bool = this.wildcardMethods.doWildcards(SComparator, sfield, comparisonValue as string, course);
				} else{
					bool = this.performStringComparison(course, SComparator, sfield,
						comparisonValue as unknown as string);
				}
			} else {
				throw new InsightError("sfield is not valid");
			}
		}
		return bool;
	}

	private checkSfieldValid(sfield: string): boolean {
		return sfield === "title" || sfield === "instructor" || sfield === "dept" ||
			sfield === "uuid" || sfield === "id";
	}

	private performStringComparison(course: Section | Room, SComp: string, sfield: string, compString: string): boolean{
		let bool = false;
		if (SComp === "IS") {
			bool = course[sfield] === compString;
		} else {
			throw new InsightError("Invalid SComparator");
		}
		return bool;
	}

	public checkValidQuery(query: unknown) {
		if (typeof query !== "object" || query === null || Array.isArray(query)) {
			throw new InsightError("Query not of type object, or is null");
		}
		const {WHERE, OPTIONS} = query as Query;
		if (!WHERE || !OPTIONS) {
			throw new InsightError("Query must contain both WHERE and OPTIONS blocks");
		}
	}

	public sortResult(optionsResult: QueryOptions, queryResult: InsightResult[]) {
		// if order exists
		if (optionsResult.ORDER !== undefined) {
			if (typeof (optionsResult.ORDER) === "string") {
				let option = optionsResult.ORDER;
				queryResult.sort((a, b) => {
					const fieldA = a[option].toString();
					const fieldB = b[option].toString();
					if (fieldA < fieldB) {
						return -1;
					} else if (fieldA > fieldB) {
						return 1;
					} else {
						return 0;
					}
				});
			} else {
				let complexOptions = optionsResult.ORDER;
				return queryResult.sort((a, b) => {
					for (const key of complexOptions.keys) {
						// Assume the values can be directly compared (adjust logic for different data types if needed)
						let option = key;
						let fieldA = a[option].toString();
						let fieldB = b[option].toString();
						if (complexOptions.dir === "UP") {
							if (fieldA < fieldB) {
								return -1;
							} else if (fieldA > fieldB) {
								return 1;
							}
						} else {
							if (fieldA < fieldB) {
								return 1;
							} else if (fieldA > fieldB) {
								return -1;
							}
						}
						// If comparison === 0, continue to the next key
					}
					return 0; // Items are equal according to all keys
				});
			}
		}
	}


	// ensures that transformations follows proper ebnf formatting.
	public parseAndValidateTransformations(TRANSFORMATIONS: TransformationOptions): TransformationOptions {
		if (!Object.prototype.hasOwnProperty.call(TRANSFORMATIONS, "GROUP") ||
			!Object.prototype.hasOwnProperty.call(TRANSFORMATIONS, "APPLY") ||
			Object.keys(TRANSFORMATIONS).length > 2) {
			throw new InsightError("invalid transformations");
		}
		// set name of dataset
		const nameOfDataset = Object.values(TRANSFORMATIONS)[0][0].split("_")[0];
		this.setNameOfDataset(nameOfDataset);
		// set group and apply to transformations
		let transformations1 = {
			GROUP: Object.values(TRANSFORMATIONS)[0],
			APPLY: Object.values(TRANSFORMATIONS)[1]
		};
		// set global variable containing GROUP
		// this.groupByArray = transformations1.GROUP; // this may be unneeded

		// todo: assign all applykeys to some global variable so that columns and sort can use them (HOW DO THEY USE THEM THOOOO???)

		return transformations1;


		// check group. returns a value
		// iterate through a list of keys
		// iterate through each key, and get idestring, mfield/sfield

		// check apply
		// iterate through a list of applyrules
	}

	public formatResults(queryResult: InsightResult[], optionsResult: QueryOptions) {
		for (let i of this.resultArray) {
			// first check that dataset names are all the same
			let result: InsightResult = {};
			for (let col of optionsResult.COLUMNS) {
				let columnName = col.split("_")[0] + "_" + col.split("_")[1]; // for applykey in COLUMNS, if _ DNE then
				result[columnName] = i[col.split("_")[1]];
			}
			// todo: printing is changing.
			// in columns have to .
			queryResult.push(result);
		}
	}

	public checkWhere(WHERE: LogicComparison | MCOMPARISON | SCOMPARISON) {
		if(Object.keys(WHERE).length !== 0){
			this.filterAllGivenCourses(WHERE);
		}else{
			this.resultArray = this.courses;
		}
	}
}

export function checkMfieldValid(mfield: string): boolean {
	return mfield === "id" ||
		mfield === "year" ||
		mfield === "avg" ||
		mfield === "pass" ||
		mfield === "fail" ||
		mfield === "audit";
}


// todo conveyor belt: parseandvaltrans, validate keys in options (will have to , group answers by group, apply the rules for each group, then sort and print
