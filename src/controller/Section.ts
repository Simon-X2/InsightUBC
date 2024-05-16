import InsightFacade from "./InsightFacade";
import {InsightError} from "./IInsightFacade";

export default class Section {
	[key: string]: string | number;
	private readonly uuid: string;
	private readonly id: string;
	private readonly title: string;
	private readonly instructor: string;
	private readonly dept: string;
	private readonly year: number;
	private readonly avg: number;
	private readonly pass: number;
	private readonly fail: number;
	private readonly audit: number;

	constructor(json: any) {
		let section = json;
		if(section.Section === "overall") {
			this.year = 1900;
		} else{
			this.year = parseInt(section.Year, 10);
		}
		this.uuid = section.id.toString();
		this.id = section.Course;
		this.title = section.Title;
		this.instructor = section.Professor;
		this.dept = section.Subject;
		this.avg = section.Avg;
		this.pass = section.Pass;
		this.fail = section.Fail;
		this.audit = section.Audit;
	}

	// new
	// this is how i wanted to set it up
	// [key: string]: string | number;
	// uuid: string;
	// id: number;
	// title: string;
	// instructor: string;
	// dept: string;
	// year: number;
	// avg: number;
	// pass: number;
	// fail: number;
	// audit: number;

	// public validate(): boolean {
	// 	return (
	// 		this.id !== null &&
	// 		this.uuid !== null &&
	// 		this.title !== null &&
	// 		this.instructor !== null &&
	// 		this.dept !== null &&
	// 		this.year !== null &&
	// 		this.avg !== null &&
	// 		this.pass !== null &&
	// 		this.fail !== null &&
	// 		this.audit !== null
	// 	);
	// }
}

// export interface mfield {
// 	year: number;
// 	avg: number;
// 	pass: number;
// 	fail: number;
// 	audit: number;
// }
