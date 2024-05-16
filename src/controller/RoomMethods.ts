// beyond is all helper functions for unpacking rooms and parsing rooms
import Room from "./Room";
import JSZip from "jszip";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
let parse5 = require("parse5");
import InsightFacade from "./InsightFacade";
import * as child_process from "child_process";
import * as http from "http";
interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}
export async function unpackRoomZip(content: string, path: string): Promise<Array<[string, string]>> {
	// load zip file
	// make a list of promises for promise.all
	// change this to parallel
	try {

		const buffer = Buffer.from(content, "base64");
		const zip = await JSZip.loadAsync(buffer);
		if(zip.files[path] !== null){
			// an array of tuples with first element being the name of the file
			let listOfPromises: any = [];
			let listOfRooms: Array<[string, any]> = [];
			let listofNames: string[] = [];
			// iterate through the files and add them to a promise list
			Object.keys(zip.files).forEach((file) => {
				if (zip.files[file] !== null && !zip.files[file].dir) {
					let fileName = file.substring(file.lastIndexOf("/") + 1).split(".")[0];
					let filePromise = zip.files[file].async("string");
					listofNames.push(fileName as string);
					listOfPromises.push(filePromise);
				}
			});
			let listOfPromisesDone = await Promise.all(listOfPromises);
			let i = 0;
			for(let element of listOfPromisesDone){
				listOfRooms.push([listofNames[i], element]);
				i++;
			}
			return listOfRooms;
		} else {
			return Promise.reject("UnpackRoomZip: Specified path doesn't exist");
		}
		// iterate through the promise lists and iterate through sections to parse them into the right structure
		// return 	Promise.reject(new InsightError("Unpack Zip: Invalid html file"));
	} catch (e) {
		return Promise.reject(new InsightError(`Unpack zip Room: ${e}`));
	}
}
// Function to recursively search for table nodes
export function searchForTables(node: any, type: string): any {
	try {
		// Check the current node itself.
		if (node.tagName === "table" && isValidTable(node, type)) {
			return node;
		}
		// If the current node has child nodes, recurse through them.
		if (node.childNodes && node.childNodes.length > 0) {
			for (let childNode of node.childNodes) {
				let resultNode = searchForTables(childNode, type);
				if (resultNode !== null) {
					// Return as soon as a valid node is found.
					return resultNode;
				}
			}
		}
		// Return null if no valid node is found in this branch.
		return null;
	} catch (e) {
		throw new InsightError(`SearchForTables: ${e}`);
	}
}

// Example criteria function to determine if a table is valid (DOESNT WORK RN)
export function isValidTable(node: any, type: string) {
	try{
		// if(type === "building"){
		// 	const classAttribute = node.attrs.find((attr: any) => attr.name === "class");
		// 	return classAttribute && classAttribute.value.split(" ").includes("view-field") &&
		// 		classAttribute.value.split(" ").includes("views-field-field-building-address");
		// } else if(type === "room"){
		// 	const classAttribute = node.attrs.find((attr: any) => attr.name === "class");
		// 	return classAttribute && classAttribute.value.split(" ").includes("view-field") &&
		// 		classAttribute.value.split(" ").includes("views-field-field-room-number");
		// }
		return true;
	} catch(e){
		throw new InsightError(`isValidTable: ${e}`);
	}
}

// to get lat and lon using address
async function getGeoLocation(address: string): Promise<GeoResponse> {
	let encodedAddress = encodeURIComponent(address);
	let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team075/" + encodedAddress;
	return new Promise((resolve, reject) => {
		http.get(url, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				try {
					const parsedData: GeoResponse = JSON.parse(data);
					resolve(parsedData);
				} catch (e) {
					reject(new Error("Failed to parse respnse as JSON"));
				}
			});
		}).on("error", (e) => {
			reject(new Error(`Failed to fetch geolocation: ${e.message}`));
		});
	});
}

// async function getGeoLocations(buildings: Array<[string, string]>, rooms: Room[]): Promise<void> {
// 	let listOfPromises: Array<Promise<GeoResponse>> = [];
// 	for(let building of buildings){
// 		listOfPromises.push(getGeoLocation(building[1]));
// 	}
// 	let allGeo = await Promise.all(listOfPromises);
// 	let allGeoBuildings: Array<[string, GeoResponse]> = [];
// 	let i = 0;
// 	for(let name of buildings){
// 		allGeoBuildings.push([name[0], allGeo[i]]);
// 		i++;
// 	}
// 	for(let room of rooms){
// 		for(let allGeoBuilding of allGeoBuildings){
// 			if(allGeoBuilding[0] === room.shortname){
// 				room.lat = allGeoBuilding[1].lat as number;
// 				room.lon = allGeoBuilding[1].lon as number;
// 			}
// 		}
// 	}
// }


async function getGeoLocations(buildings: Array<{shortname: string, address: string}>):
	Promise<Map<string, GeoResponse>> {
	let listOfPromises: Array<Promise<GeoResponse>> = [];
	for (let building of buildings) {
		listOfPromises.push(getGeoLocation(building.address));
	}
	let allGeo = await Promise.all(listOfPromises);
	let allGeoBuildings = new Map<string, GeoResponse>();
	let i = 0;
	for (let name of buildings) {
		allGeoBuildings.set(name.shortname, allGeo[i]);
		i++;
	}
	return allGeoBuildings;
}


// // takes in a list of buildings and uses building to search for it's corresponding room and fill in info
// export async function parseRooms(data: any, content: any): Promise<Room[]>{
// 	// try {
// 	// 	let listOfRooms: Room[] = [];
// 	// 	let listOfBuildings: Array<[string, string]> = [];
// 	// 	let rooms = await unpackRoomZip(content, "campus/discover/buildings-and-classrooms/");
// 	//
// 	//
// 	// 	for (const childNode of data.childNodes) {
// 	// 		if (childNode.nodeName === "tbody") {
// 	// 			for (let element of childNode.childNodes) {
// 	// 				if (element.nodeName === "tr") {
// 	// 					let shortnameLONG = nodeSearch("views-field views-field-field-building-code", element);
// 	// 					let shortname = shortnameLONG.trim().replace(/\s+/g, "").replace(/\W+/g, "");
// 	// 					let address = nodeSearch("views-field views-field-field-building-address", element);
// 	// 					address = address.trim();
// 	// 					listOfBuildings.push([shortname, address]);
// 	//
// 	// 					for (let document of rooms) {
// 	// 						if (document[0] === shortname) {
// 	// 							if(document[1] !== undefined){
// 	// 								let html = parse5.parse(document[1] as string);
// 	// 								let validTable = searchForTables(html, "room");
// 	//
// 	// 								if(validTable !== null){
// 	// 									let fullnameLONG = nodeSearch("building-info", html);
// 	// 									let fullname = fullnameLONG.trim();
// 	// 									for(element of validTable.childNodes){
// 	// 										if(element.nodeName === "tbody"){
// 	// 											for(let node of element.childNodes) {
// 	// 												if(node.nodeName === "tr") {
// 	// 													let room = new Room();
// 	// 													room.fullname = fullname;
// 	// 													room.shortname = shortname;
// 	// 													room.address = address;
// 	// 												// room.lat = latLon.lat as number;
// 	// 												// room.lon = latLon.lon as number;
// 	// 													getRoomInfo(node, room);
// 	// 													listOfRooms.push(room);
// 	// 												}
// 	// 											}
// 	// 										}
// 	// 									}
// 	// 								}
// 	//
// 	// 							}
// 	// 						}
// 	// 					}
// 	// 				}
// 	//
// 	// 			}
// 	// 		}
// 	// 	}
// 	// 	let promise = await getGeoLocations(listOfBuildings, listOfRooms);
// 	// 	return listOfRooms;
// 	//
// 	// }catch(e) {
// 	// 	return Promise.reject(new InsightError(`ParseRoom: ${e}`));
// 	// }
//
// 	try {
// 		let rooms = await unpackRoomZip(content, "campus/discover/buildings-and-classrooms/");
// 		let listOfBuildings: Array<{shortname: string, address: string}> = [];
// 		let roomsData: Room[] = [];
//
// 		// Collect shortname and address for geolocation fetching
// 		data.childNodes.forEach((childNode: any) => {
// 			if (childNode.nodeName === "tbody") {
// 				childNode.childNodes.forEach((element: any) => {
// 					if (element.nodeName === "tr") {
// 						const shortname = nodeSearch("views-field views-field-field-building-code",
// 							element).trim().replace(/\s+/g, "").replace(/\W+/g, "");
// 						const address = nodeSearch("views-field views-field-field-building-address", element).trim();
// 						listOfBuildings.push({shortname, address});
// 					}
// 				});
// 			}
// 		});
//
// 		// Fetch geolocations in batch
// 		const geolocations: Map<string, GeoResponse> = await getGeoLocations(listOfBuildings); // Assume this function is implemented to fetch in batch
//
// 		rooms.forEach((document) => {
// 			const building = listOfBuildings.find((b) => b.shortname === document[0]);
// 			if (building && document[1]) {
// 				const html = parse5.parse(document[1] as string);
// 				const validTable = searchForTables(html, "room");
//
// 				if (validTable) {
// 					const fullname = nodeSearch("building-info", html).trim();
// 					validTable.childNodes.forEach((node: any) => {
// 						if (node.nodeName === "tbody") {
// 							node.childNodes.forEach((child: any) => {
// 								if (child.nodeName === "tr") {
// 									const room = new Room();
// 									room.fullname = fullname;
// 									room.shortname = building.shortname;
// 									room.address = building.address;
// 									const geo = geolocations.get(building.shortname);// Assuming geolocations is a map of address to lat/lon
// 									room.lat = geo.lat as number;
// 									room.lon = geo.lon as number;
// 									getRoomInfo(child, room);
// 									roomsData.push(room);
// 								}
// 							});
// 						}
// 					});
// 				}
// 			}
// 		});
//
// 		return roomsData;
// 	} catch (e) {
// 		return Promise.reject(new InsightError(`ParseRoom: ${e}`));
// 	}
// }

export async function parseRooms(data: any, content: any): Promise<Room[]> {
	try {
		const rooms = await unpackRoomZip(content, "campus/discover/buildings-and-classrooms/");
		const listOfBuildings = extractBuildingInfo(data);
		const geolocations = await getGeoLocations(listOfBuildings); // Assuming this returns a map { [address: string]: GeoResponse }

		const roomsData = rooms.flatMap((document) => {
			const building = listOfBuildings.find((b) => b.shortname === document[0]);
			if (!building || !document[1]) {
				return [];
			}

			const html = parse5.parse(document[1] as string);
			const validTable = searchForTables(html, "room");
			if (!validTable) {
				return [];
			}

			const fullname = nodeSearch("building-info", html).trim();
			return processRoomNodes(validTable, building, fullname, geolocations);
		});

		return roomsData;
	} catch (e) {
		return Promise.reject(new InsightError(`ParseRoom: ${e}`));
	}
}

function extractBuildingInfo(data: any): Array<{shortname: string, address: string}> {
	// Assuming data has the required structure
	return data.childNodes.flatMap((childNode: any) =>
		childNode.nodeName === "tbody" ?
			childNode.childNodes.filter((element: any) => element.nodeName === "tr").map((element: any) => ({
				shortname: nodeSearch("views-field views-field-field-building-code",
					element).trim().replace(/\s+/g, "").replace(/\W+/g, ""),
				address: nodeSearch("views-field views-field-field-building-address", element).trim()
			})) : []
	);
}

function processRoomNodes
(validTable: any, building: {shortname: string, address: string},
	fullname: string, geolocations: Map<string, GeoResponse>): Room[]{
	// Assuming validTable, building, fullname, and geolocations have the required structure and types
	try{
		return validTable.childNodes.flatMap((node: any) =>
			node.nodeName === "tbody" ?
				node.childNodes.filter((child: any) => child.nodeName === "tr").map((child: any) => {
					const room = new Room(); // Assuming Room constructor can handle partial initialization
					room.fullname = fullname;
					room.shortname = building.shortname;
					room.address = building.address as string;
					const geo = geolocations.get(building.shortname) as GeoResponse;
					room.lat = geo.lat as number;
					room.lon = geo.lon as number;
					getRoomInfo(child, room); // Assuming this function modifies the room object directly
					return room;
				}) : []
		);
	}catch(e){
		throw new Error(`ProcessRoomNodes ${e}`);
	}

}


// given a /td section, parse all data
export function getRoomInfo(element: any, room: Room): any {
	room.number = nodeSearch("views-field views-field-field-room-number", element);
	room.href = nodeSearch("href", element);
	room.name = room.shortname + "_" + room.number;
	room.type = nodeSearch("views-field views-field-field-room-type", element).trim();
	room.furniture = nodeSearch("views-field views-field-field-room-furniture", element).trim();
	room.seats = parseInt(nodeSearch("views-field views-field-field-room-capacity", element).trim(), 10);
}

export function nodeSearch(viewsFieldViewsFieldTitle: string, node: any): any{
	const queue: any[] = [node];
	while (queue.length > 0) {
		const currentNode: any = queue.pop(); // Remove and get the first element of the queue
		if(currentNode.attrs && currentNode.attrs.length > 0){
			let value = currentNode.attrs[0].value;
			// href special case, I'll hard code it for now
			if(viewsFieldViewsFieldTitle === "href") {
				return currentNode.childNodes[1].childNodes[1].attrs[0].value;
			}

			if (value === viewsFieldViewsFieldTitle) {
				// room number special case hard code for now
				if(viewsFieldViewsFieldTitle === "views-field views-field-field-room-number"){
					return currentNode.childNodes[1].childNodes[0].value;
				}
				if(viewsFieldViewsFieldTitle === "building-info"){
					return currentNode.childNodes[1].childNodes[0].childNodes[0].value;
				}
				return currentNode.childNodes[0].value;
			}
		}

		if(currentNode.childNodes){
			// Add all children to the queue
			for (const child of currentNode.childNodes) {
				queue.push(child);
			}
		}

	}
	throw new InsightError("NodeSearch: Node name doesnt exist" + viewsFieldViewsFieldTitle);
}
