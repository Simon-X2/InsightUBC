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
import {QueryMethods} from "./QueryMethods";
import {RoomQueryMethods} from "./RoomQueryMethods";

import {throws} from "node:assert";
// import Room from "./Room";
import Room from "./Room";
import {parseRooms, searchForTables, unpackRoomZip} from "./RoomMethods";
let parse5 = require("parse5");

// import JSON = Mocha.reporters.JSON;

interface JsonArray {
	key: string;
	sectionArray: Section[];
}


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

export default class InsightFacade implements IInsightFacade {
	// private datasets: Map<string, Section[]>;
	private sectionsIds: string[];
	private queryMethods = new QueryMethods();

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.sectionsIds = [];
	}

	public async preloadData() {
		// old version
		try {
			const fileExists = await fs.pathExists("./data/data.json");
			if (fileExists && this.sectionsIds.length === 0) {
				let json = await loadDataFromDisk("./data/data.json");
				let jsonArray: Array<[string, string, Section[]]> = JSON.parse(json);
				for (const [id, kind, sections] of jsonArray) {
					this.sectionsIds.push(id);
				}
			} else if (this.sectionsIds.length === 0) {
				let promise = await saveDataToDisk("");
			}
		} catch (e) {
			return Promise.reject(new InsightError(`pre-load data failed: ${e}`));
		}
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		try {
			let promise = await this.preloadData();
			let jsonArray: Array<[string, string, any[]]> = [];
			// checks if id is valid, return with insight error if not
			if (!this.sectionsIds.includes(id) && checkValidID(id)) {
				if (kind === InsightDatasetKind.Sections) {
					let sectionList: Section[] = await unpackZip(content);
					if (sectionList.length !== 0) {
						// create a map of datasets and relate it to the id of added section list
						if (this.sectionsIds.length !== 0) {
							let json = await loadDataFromDisk("./data/data.json");
							jsonArray = JSON.parse(json);
						}
						jsonArray.push([id, "section", sectionList]);
						let jsonString = JSON.stringify(jsonArray);
						let promise2 = await saveDataToDisk(jsonString);
						// make sure to import the actual json data
						this.sectionsIds.push(id);
						return Array.from(this.sectionsIds);
					}
					return Promise.reject(new InsightError("Less than 0 valid sections"));
				} else if (kind === InsightDatasetKind.Rooms) {
					// invalid for C1
					const html = await unpackRoomZip(content, "index.htm");
					// search for valid tables

					const buffer = Buffer.from(content, "base64");
					const zip = await JSZip.loadAsync(buffer);
					let filePromise = await zip.files["index.htm"].async("string");

					const document = parse5.parse(filePromise);
					const tableData = searchForTables(document, "building");
					let listOfRooms: Room[] = await parseRooms(tableData, content);
					if (listOfRooms.length !== 0) {
						// create a map of datasets and relate it to the id of added section list
						if (this.sectionsIds.length !== 0) {
							let json = await loadDataFromDisk("./data/data.json");
							jsonArray = JSON.parse(json);
						}
						jsonArray.push([id, "room", listOfRooms]);
						let jsonString = JSON.stringify(jsonArray);
						let promise2 = await saveDataToDisk(jsonString);
						this.sectionsIds.push(id);
						return Array.from(this.sectionsIds);
					}
					return Promise.reject(new InsightError("Less than 0 valid rooms"));
				} else if(kind !== InsightDatasetKind.Rooms || kind !== InsightDatasetKind.Sections){
					return Promise.reject(new InsightError("Invalid kind"));
				}
			}
			return Promise.reject(new InsightError("Invalid ID"));
		} catch (e) {
			return Promise.reject(
				new InsightError(`Add data set throwing error:${e}`));
		}
	}

	public async removeDataset(id: string): Promise<string> {
		try {
			let promise = await this.preloadData(); // old version
			if (checkValidID(id)) {
				if (this.sectionsIds.includes(id)) {
					this.sectionsIds.splice(this.sectionsIds.indexOf(id));
					let json = await loadDataFromDisk("./data/data.json");
					let newJsons = JSON.parse(json);
					newJsons = newJsons.filter(([key, _]: [string, string, any[]]) => {
						return key !== id;
					});

					let jsonFromString = JSON.stringify(newJsons);
					let promise3 = await saveDataToDisk(jsonFromString); // old version
					// let promise3 = await saveDataToDisk(jsonFromString);

					return id;
				} else {
					return Promise.reject(new NotFoundError());
				}
			}
			return Promise.reject(new InsightError("Invalid ID"));
		} catch (err) {
			return Promise.reject(`Remove dataset throwing error: ${err}`);
		}
	}

	/** literally perform my query boyo
	 */
	public async performQuery(query: unknown): Promise<InsightResult[]> {
		this.queryMethods.roomQueryMethods = new RoomQueryMethods();
		// check that query is of type object, and that query is not null
		this.queryMethods.checkValidQuery(query);
		// since query exists and is of type query, we can begin checking where and options
		let {WHERE, OPTIONS,TRANSFORMATIONS} = query as Query;
		// check syntax of where and options of query
		try {
			let queryResult: InsightResult[] = [];
			this.queryMethods.courses = [];
			// actually perform options
			this.queryMethods.nameOfDataset = "";

			// set "rooms or sections type" identifier
			this.queryMethods.roomQueryMethods.queryIsTypeRoomsVar =
				this.queryMethods.roomQueryMethods.isQueryRoomsOrSections(query as Query);
			// actually fill course array with all courses of the dataset name
			// loads json from data storage
			let json = await loadDataFromDisk("./data/data.json");
			// parses loaded data from json, and returns an array of tuples in the form of [id, section[]]
			let newJsons = JSON.parse(json);
			let transformationsContent: any = null;
			// filters all array so that only array left is the one fitting our id
			if(TRANSFORMATIONS) { // note to self, is this the same thing as typeof !==???
				transformationsContent = this.queryMethods.parseAndValidateTransformations(
					TRANSFORMATIONS as TransformationOptions);
			}
			let optionsResult = this.queryMethods.parseAndValidateOptions(OPTIONS);
			this.findDataset(newJsons);
			// actually perform where
			this.queryMethods.checkWhere(WHERE);

			// TODO: group answers by GROUP
			if(TRANSFORMATIONS) { // note to self, is this the same thing as typeof !==???

				let groups = this.queryMethods.roomQueryMethods.doGrouping(
					transformationsContent as TransformationOptions, this.queryMethods.resultArray);
				this.queryMethods.roomQueryMethods.checkValidApplyKey(TRANSFORMATIONS.APPLY as ApplyRule[]);
				let applyResults = this.queryMethods.roomQueryMethods.executeApply(groups,
					TRANSFORMATIONS.APPLY as ApplyRule[], TRANSFORMATIONS);
				this.queryMethods.roomQueryMethods.checkKeyInColumnInApply(TRANSFORMATIONS, optionsResult);
				let groupings = applyResults[applyResults.length - 1];
				this.queryMethods.roomQueryMethods.groupTransform(groupings, TRANSFORMATIONS,
					queryResult, applyResults, optionsResult);

				if (queryResult.length > 5000) {
					return Promise.reject(new ResultTooLargeError("exceeded 5000 results"));
				}
			} else {
				// TODO: this is commented out to pass the linter, make sure to uncomment if u want sections printing to work
				// for cases w/o group
				if (!this.checkDatasetNamesForColumns(optionsResult, this.queryMethods.roomQueryMethods)) {
					return Promise.reject(new InsightError("Dataset names must be consistent"));
				}
				this.queryMethods.formatResults(queryResult, optionsResult);
				if (queryResult.length > 5000) {
					return Promise.reject(new ResultTooLargeError("exceeded 5000 results"));
				}
			}

			if (optionsResult.ORDER !== undefined) { // todo: need to be able to sort for SORT as well as ORDER
				this.queryMethods.sortResult(optionsResult, queryResult);
			}

			return queryResult;
		} catch (e) {
			return Promise.reject(new InsightError(`Perform Query: ${e}`));
		}
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		try {
			let dataset: InsightDataset[] = [];
			const fileExists = await fs.pathExists("./data/data.json");
			if (fileExists) {
				let jsonString = await loadDataFromDisk("./data/data.json");
				const jsonArray: Array<[string, string, any[]]> = JSON.parse(jsonString);
				jsonArray.forEach(([key, kind, value]) => {
					dataset.push(createInsightDataset(value.length, kind, key));
				});
			}
			return dataset;
		} catch (err) {
			return Promise.reject(err);

		}
	}

	private checkDatasetNamesForColumns(optionsResult: QueryOptions, roomQuery: RoomQueryMethods): boolean {
		for (let col of optionsResult.COLUMNS) {
			if (col.split("_")[0] !== this.queryMethods.nameOfDataset && !roomQuery.applyKeyList.includes(col)){
				return false;
			}
		}
		return true;
	}

	public findDataset(newJsons: any) {
		try{
			newJsons = newJsons.filter(([key, _]: [string, string, Section[]]) => {
				return key === this.queryMethods.nameOfDataset;
			});

			if(!(newJsons.length > 0)){
				throw new InsightError("Dataset doesn't exsist");
			}

			// nested loop maybe not the best, pushes all courses to qmethods
			for (const [id, kind, sections] of newJsons) {
				if (id === this.queryMethods.nameOfDataset) {
					for (let section of sections) {
						this.queryMethods.courses.push(section); // bug fixed. should be section not sections
					}
				}
			}
		}catch(err){
			throw new InsightError(`FindDataset: ${err}`);
		}
	}


}

async function saveDataToDisk(data: any): Promise<void> {
	try {
		const directoryPath = "./data";
		await fs.ensureDir(directoryPath); // fs-extra's ensureDir automatically creates the directory if it does not exist.
		const filePath = `${directoryPath}/data.json`;
		await fs.writeFile(filePath, data); // Ensure data is serialized to a JSON string if it's not already.
	} catch (error) {
		throw new Error(`saveDataToDisk: ${error}`);
	}
}

// helper function that takes in a file path to load data, returns a json string
async function loadDataFromDisk(filePath: string): Promise<any> {
	try {
		const dataString = await fs.readFile(filePath);
		return dataString;
	} catch (error) {
		return Promise.reject(`loaddata: ${error}`);
	}
}

// create a new instance of insight dataset given the id, kind and list of sections
function createInsightDataset(value: number, kind: string, key: string): InsightDataset {
	let numRows = value;
	let id = key;
	let datasetKind: InsightDatasetKind;
	if(kind === "room") {
		datasetKind = InsightDatasetKind.Rooms;
	} else if (kind === "section"){
		datasetKind = InsightDatasetKind.Sections;
	} else {
		throw new InsightError("CreateInsightDataset: wrong kind inputed");
	}

	return new InsightDatasets(id, datasetKind, numRows);
}

// parse json data into list of sections
function turnIntoSections(data: any): any[] {
	let sections: Section[] = [];
	if (data !== null && data !== "") {
		let parsedJson = JSON.parse(data).result;
		if (parsedJson.length !== 0) {
			for (const element of parsedJson) {
				let newSect = new Section(element); // changed Section(element) to
				sections.push(newSect);
			}
		}
	}
	return sections;
}

// check that any given id meets the specification
export function checkValidID(id: string): boolean {
	const isWhitespaceString = !id.replace(/\s/g, "").length;
	return !id.includes("_") && id !== "" && !isWhitespaceString;
}

async function unpackZip(content: string): Promise<Section[]> {
	try {
		const buffer = Buffer.from(content, "base64");
		const zip = await JSZip.loadAsync(buffer);
		let listOfPromises: any[] = [];
		let listOfSections: any[] = [];
		// iterate through the files and add them to a promise list
		Object.keys(zip.files).forEach((file) => {
			if (zip.files[file] !== null) {
				let filePromise = zip.files[file].async("string");
				listOfPromises.push(filePromise);
			}
		});

		// iterate through the promise lists and iterate through sections to parse them into the right structure
		let allPromises = await Promise.all(listOfPromises);
		for (let item of allPromises) {
			listOfSections.push(turnIntoSections(item));
		}
		return listOfSections.flat();
	} catch (e) {
		return Promise.reject(new InsightError(`Unpack zip: ${e}`));
	}
}
