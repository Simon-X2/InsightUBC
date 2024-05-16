import {InsightDataset, InsightDatasetKind} from "./IInsightFacade";

export default class InsightDatasets implements InsightDataset {
	public id: string;
	public kind: InsightDatasetKind;
	public numRows: number;
	constructor(id: string, kind: InsightDatasetKind, numRows: number) {
		this.id = id;
		this.kind = kind;
		this.numRows = numRows;
	}
}
