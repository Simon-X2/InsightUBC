/**
 * interfaces for the modelling of a query
 **/

export interface Query {
	WHERE: Filter;
	OPTIONS: QueryOptions;

	TRANSFORMATIONS?: TransformationOptions;
}

export interface QueryOptions {
	COLUMNS: string[];
	ORDER?: SortTypes;
}

export interface LogicComparison {
	AND: Filter[];
	OR: Filter[];
	NOT: Filter;
}

export interface MCOMPARISON {
	MCOMPARATOR: "LT" | "GT" | "EQ";
	mkey: string;
	numval: number;
}

export interface SCOMPARISON {
	is: "IS"; // check this prob wrong format
	skey: string;
	inputstring: string;
}

// export interface NEGATION {
// 	not: "NOT";
// 	FILTER: Filter;
// }

export type Filter = LogicComparison | MCOMPARISON | SCOMPARISON;

// new stuff for C2

export interface TransformationOptions {
	GROUP: string[];
	APPLY: ApplyRule[];
}

// NEW SHIT ApplyRule Interface for handling the APPLY part of TRANSFORMATIONS
export interface ApplyRule {
	[applykey: string]: {
		[APPLYTOKEN: string]: string; // The APPLYTOKEN can be 'MAX', 'MIN', 'AVG', 'COUNT', or 'SUM'

	};
}
export type SortTypes = DirectionObject | string;

export interface DirectionObject {
	dir: "UP" | "DOWN";
	keys: string[];
}

