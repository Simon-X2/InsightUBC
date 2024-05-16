import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import Section from "./Section"; // add {} if Section is an interface
import JSZip from "jszip";
import InsightDatasets from "./InsightDatasets";
import * as fs from "fs-extra";
import {
	Query,
	QueryOptions,
	Filter,
	LogicComparison,
	MCOMPARISON,
	SCOMPARISON,
	TransformationOptions, ApplyRule
} from "./QueryInterfaces";
import {checkMfieldValid, QueryMethods} from "./QueryMethods";
import Decimal from "decimal.js";

export class RoomQueryMethods {
	// private queryMethods = new QueryMethods();
	// public groupByArray: string[] = [];
	public queryIsTypeRoomsVar = false;
	public applyKeyList: string[] = [];
	public datasetName: string = "";
	private keyList: string[] = [];

	// checks for attributes that belong to rooms type query, and returns true if those attributes are found.
	// returns true if query is of type rooms, otherwise returns false

	public isQueryRoomsOrSections(query: Query): boolean {
		let {WHERE, OPTIONS} = query as Query;
		let {COLUMNS} = OPTIONS as QueryOptions;
		if("TRANSFORMATIONS" in query || "SORT" in OPTIONS) {
			return true;
		}
		for(let i of COLUMNS) {
			let field: string = i.split("_")[1];
			if(field === "fullname" || field === "shortname" || field === "number" || field === "name" ||
				field === "address" || field === "lat" || field === "lon" || field === "seats" || field === "type" ||
				field === "furniture" || field === "href") {
				return true;
			}
		}
		return false;
	}

	// checks if mfields are valid for a rooms type query. returns true if valid, otherwise returns false
	public checkRoomsMfieldValid(mfield: string): boolean {
		if (
			mfield === "avg" ||
			mfield === "pass" ||
			mfield === "fail" ||
			mfield === "audit" ||
			mfield === "year" ||
			mfield === "lat" ||
			mfield === "lon" ||
			mfield === "seats"
		) {
			return true;
		} else {
			return false;
		}
	}

	// checks if sfields are valid for a rooms type query. returns true if valid, otherwise returns false
	public checkRoomsSfieldValid(sfield: string): boolean {
		if (sfield === "dept" ||
			sfield === "id" ||
			sfield === "instructor" ||
			sfield === "title" ||
			sfield === "uuid" ||
			sfield === "fullname" ||
			sfield === "shortname" ||
			sfield === "number" ||
			sfield === "name" ||
			sfield === "address" ||
			sfield === "type" ||
			sfield === "furniture" ||
			sfield === "href"
		) {
			return true;
		} else {
			return false;
		}
	}

	// TODO: this method isnt done
	// assigns columns and sort for options, used for parseAndValidateOptions
	// public assignRoomsOptions(options: QueryOptions): QueryOptions {
	// 	let optionsRooms = {
	// 		COLUMNS: Object.values(options)[0],
	// 		SORT: undefined,
	// 	};
	// 	if(options.ORDER !== undefined) {
	// 		// todo: then need to parse SORT
	// 		if(typeof (options.ORDER) === "string") {
	// 			// since ORDER is typeof string, we know that ORDER is ANYKEY and not DIRECTION & ANYKEYLIST
	// 			// optionsRooms.SORT = {
	// 			// 	ORDER: Object.values()[0]
	// 			// };
	// 		}
	// 	}
	// 	return optionsRooms;
	// }

	public doGrouping(transformations: TransformationOptions, resultArray: any[]): [any[], any[]] { // array of [any[], any[]] // TODO: comments should be adjusted. change???
		const requestedGroups = transformations.GROUP; // Extracting group criteria
		const groupings: {[key: string]: any[]} = {}; // Grouping logic
		const groupStrip: string[] = [];
		for(let groups of requestedGroups){
			groupStrip.push(groups.split("_")[1]);
			this.datasetName = groups.split("_")[0];
		}
		resultArray.forEach((course) => {
			const groupKey = groupStrip.map((criteria) => course[criteria]).join("|"); // Generating group key
			if (!groupings[groupKey]) { // Creating group if not exists
				groupings[groupKey] = [];
			}
			groupings[groupKey].push(course); // Adding course to the respective group
		});
		const groupResults = Object.values(groupings); // Converting groups object to array
		return [groupResults, Object.keys(groupings)]; // Returning the grouped data and group keys
	}

	public executeApply(groupings: [any[], any[]], applyRuleList: ApplyRule[],
		transformation: TransformationOptions): any[]{ // TODO: change???
		let result: any[] = [];
		Array.prototype.forEach.call(groupings[0], (group) => {
			let groupResult: any = {};
			Array.prototype.forEach.call(applyRuleList, (applyRule) => {
				const applyKey = Object.keys(applyRule)[0]; // Access the applykey
				const APPLYTOKEN = Object.keys(applyRule[applyKey])[0]; // Access the operation ('MAX', 'MIN', etc.)
				const key = applyRule[applyKey][APPLYTOKEN];
				if(key === ""){
					throw new InsightError("executeApply: key doesnt exist for apply");
				}


				if (APPLYTOKEN === "MAX" && this.isKeyNumeric(key.split("_")[1])) {
					groupResult[applyKey] = this.applyMaximum(group, applyRule);
				} else if (APPLYTOKEN === "MIN" && this.isKeyNumeric(key.split("_")[1])) {
					groupResult[applyKey] = this.applyMinimum(group, applyRule);
				} else if(APPLYTOKEN === "AVG" && this.isKeyNumeric(key.split("_")[1])) {
					groupResult[applyKey] = this.applyAverage(group, applyRule);
				} else if(APPLYTOKEN === "SUM" && this.isKeyNumeric(key.split("_")[1])) {
					groupResult[applyKey] = this.applySum(group, applyRule);
				} else if(APPLYTOKEN === "COUNT") {
					groupResult[applyKey] = this.applyCount(group, applyRule);
				} else {
					throw new InsightError("either token is invalid or key is not valid type for token. Token: "
						+ APPLYTOKEN + ", Key: " + key);
				}
			});
			result.push([groupResult]);
		});
		// code that prepends the key to the corresponding group object
		// i.e. instead of group = ["Jean", "Casey] now it is now group = ["sections_instructor: Jean", "sections_instructor: Casey"]
		let groupList = transformation.GROUP;
		let mapData: any[] = [];
		for(let string of groupings[1]){
			let innerObj: InsightResult = {};
			let seperatedString = (string as string).split("|");
			let i = 0;
			for(let data of seperatedString){
				innerObj[groupList[i]] = data;
				i++;
			}
			mapData.push(innerObj);
		}
		result.push(mapData);
		return result; // [[90, 150],[50, 70],  [[310, "jean"],[310, "jenny"], [210, "krissi"],[210, "penis"]]
	}

	private applyMaximum(group: any, applyRule: ApplyRule): number {
		const applykey = Object.keys(applyRule)[0]; // Access the applykey
		const APPLYTOKEN = Object.keys(applyRule[applykey])[0]; // Access the operation ('MAX', 'MIN', etc.)
		const fullkey = applyRule[applykey][APPLYTOKEN]; // "sections_instructor"
		let key: string = fullkey.split("_")[1];

		let max = group[0][key];
		Array.prototype.forEach.call(group, (item) => {
			if (item[key] > max) {
				max = item[key];
			}
		});
		return max;
	}

	private applyMinimum(group: any, applyRule: ApplyRule): number{
		const applykey = Object.keys(applyRule)[0]; // Access the applykey
		const APPLYTOKEN = Object.keys(applyRule[applykey])[0]; // Access the operation ('MAX', 'MIN', etc.)
		const fullkey = applyRule[applykey][APPLYTOKEN];
		let key: string = fullkey.split("_")[1];

		let min = group[0][key];
		Array.prototype.forEach.call(group, (item) => {
			if (item[key] < min) {
				min = item[key];
			}
		});
		return min;
	}

	private applyAverage(group: any, applyRule: ApplyRule): number{
		const applykey = Object.keys(applyRule)[0]; // Access the applykey
		const APPLYTOKEN = Object.keys(applyRule[applykey])[0]; // Access the operation ('MAX', 'MIN', etc.)
		const fullkey = applyRule[applykey][APPLYTOKEN];
		let key: string = fullkey.split("_")[1];

		let sum = new Decimal(0);
		Array.prototype.forEach.call(group, (item) => {
			sum = sum.plus(new Decimal(item[key]));
		});
		let avg = sum.toNumber() / group.length;
		return Number(avg.toFixed(2));
	}

	private applySum(group: any, applyRule: ApplyRule): number {
		const applykey = Object.keys(applyRule)[0]; // Access the applykey
		const APPLYTOKEN = Object.keys(applyRule[applykey])[0]; // Access the operation ('MAX', 'MIN', etc.)
		const fullkey = applyRule[applykey][APPLYTOKEN];
		let key: string = fullkey.split("_")[1];


		let total = new Decimal(0);
		Array.prototype.forEach.call(group, (item) => {
			total = total.add(item[key]);
		});
		return Number(total.toFixed(2));
	}

	private applyCount(group: any, applyRule: ApplyRule): number {
		const applykey = Object.keys(applyRule)[0]; // Access the applykey
		const APPLYTOKEN = Object.keys(applyRule[applykey])[0]; // Access the operation ('MAX', 'MIN', etc.)
		const fullkey = applyRule[applykey][APPLYTOKEN];
		let key: string = fullkey.split("_")[1];

		let count = new Set();
		Array.prototype.forEach.call(group, (item) => {
			count.add(item[key]);
		});
		return count.size;
	}

	public groupTransform
	(groupings: any, TRANSFORMATIONS:
		TransformationOptions, queryResult: InsightResult[],applyResults: any[], options: QueryOptions){
		let i = 0;
		for (let group of groupings) {
			let result: InsightResult = {};
			for(let key in group){
				if(options.COLUMNS.includes(key)) {
					let data = group[key];
					if(this.checkRoomsMfieldValid(key.split("_")[1])) {
						data = parseFloat(data);
					} else if (checkMfieldValid(key.split("_")[1])){
						data = parseInt(data, 10);
					}
					result[key] = data;
				}
			}
			if((TRANSFORMATIONS.APPLY as ApplyRule[]).length !== 0){
				let applyKeys = applyResults[i];
				for(let apply of applyKeys) {
					for(let applydata in apply){
						if(options.COLUMNS.includes(applydata)){
							let applyElement = apply[applydata];
							result[applydata] = applyElement;
						}
					}
				}
			}
			let reorderedResult: InsightResult = {};
			for(let col of options.COLUMNS){
				Object.keys(result).forEach((key) => {
					if(col === key){
						reorderedResult[key] = result[key];
					}
				});
			}
			i++;
			queryResult.push(reorderedResult);
		}
	}

	private isKeyNumeric(key: any): boolean {
		if(key === "dept" || key === "id" || key === "instructor" || key === "title" || key === "uuid" ||
			key === "fullname" || key === "shortname" || key === "number" || key === "name" || key === "address" ||
			key === "type" || key === "furniture" || key === "href") {
			return false;
		}
		return true;
	}

	public checkValidApplyKey(applyRules: ApplyRule[]) {
		Array.prototype.forEach.call(applyRules, (applyRule) => {
			const applyKey = Object.keys(applyRule)[0]; // Access the applykey
			const APPLYTOKEN = Object.keys(applyRule[applyKey])[0]; // Access the operation ('MAX', 'MIN', etc.)
			const key = applyRule[applyKey][APPLYTOKEN];

			// since we are parsing through apply, might as well get a list of all applykeys
			if(!applyKey.includes("_") && !this.applyKeyList.includes(applyKey)){ //
				this.applyKeyList.push(applyKey);
				this.keyList.push(key);
			} else{
				throw new InsightError("Apply key includes underscore, or is a duplicate applykey name: " + applyKey);
			}
		});
	}

	public checkKeyInColumnInApply(TRANSFORMATIONS: TransformationOptions, optionsResult: QueryOptions) {
		for(let col of optionsResult.COLUMNS){
			if(!this.applyKeyList.includes(col) && !TRANSFORMATIONS.GROUP.includes(col)){
				throw new InsightError("key in column not in group or apply");
			}
		}
	}
}
