import InsightFacade from "@/controller/InsightFacade";
import { NextResponse } from "next/server";
import {InsightDatasetKind} from "@/controller/IInsightFacade";
import {Query} from "@/controller/QueryInterfaces";
var http = require("http");
var url = require("url");

export const PUT = async (req: any, res: any) => {
    const formData = await req.formData();
    var pathname = new URL(req.url).pathname
    var pathComp = pathname.split("/")
    // console.log(pathComp);

    const file = formData.get("file");

    if (!file) {
        return NextResponse.json({ Message: "No files received." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // const filename =  file.name.replaceAll(" ", "_");
    // console.log(filename);
    try {
        const datasetID = pathComp[2]
        const datasetKind = pathComp[3] as InsightDatasetKind
        let insight = new InsightFacade();
        let result = await insight.addDataset(datasetID, buffer.toString("base64"), datasetKind);

        return NextResponse.json({ Message: `Success: Added ${datasetID}`, status: 200 });
    } catch (error) {
        console.log("Error occured ", error);
        return NextResponse.json({ Message: `Invalid ID or Invalid Zip File`, status: 400 });
    }
};

export const DELETE = async (req: any, res: any) => {
    var pathname = new URL(req.url).pathname
    var pathComp = pathname.split("/")
    // console.log(pathComp)

    try {
        const datasetID = pathComp[2]
        let insight = new InsightFacade();
        let result = await insight.removeDataset(datasetID);

        return NextResponse.json({ Message: `Success: deleted ${datasetID}`, status: 200 });
    } catch (error) {
        console.log("Error occured ", error);
        return NextResponse.json({ Message: `${error}`, status: 400 });
    }
};

export const POST = async (req: any, res: any) => {

    try {
        const formData = await req.formData();
        let queryJson = formData.get('json');
        let query = JSON.parse(queryJson) as Query;
        // console.log(query);
        let insight = new InsightFacade();
        let result = await insight.performQuery(query);
        return NextResponse.json({ Message: "Success", status: 200, body: result});
    } catch (error) {
        console.log("Error occured ", error);
        return NextResponse.json({ Message: "Failed", status: 500 });
    }
};

