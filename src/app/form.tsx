"use client";
import React, {useState} from 'react';
import BarChart from "@/app/Chart";
import Button from "@/app/button";
import {style} from "d3";

class Form extends React.Component<{}, { filedata:any, selectedFile:any, currentDataset: string[], queryData: any[],
    graphs: any }> {
    constructor(props: any) {
        super(props);
        this.state = {
            filedata: null,
            selectedFile: null,
            graphs: null,
            currentDataset: [],
            queryData: []

        };
        this.handleSubmit = this.handleSubmit.bind(this);
        this.onFileChange = this.onFileChange.bind(this);
        this.removeItem = this.removeItem.bind(this);
        this.getBase64 = this.getBase64.bind(this);
    }

    // On file select (from the pop up)
    onFileChange(e: any) {
        // Update the state
        this.setState({
            selectedFile: e.target.files[0],
        });
    };

    getBase64(file: File) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Function to update the state based on input changes
    async handleSubmit(e: any) {
        e.preventDefault();
        const currentItems = this.state.currentDataset;
        const newItem = "test";

        const fileInput = document.getElementById("fileInput"); // Replace with your HTML element ID
        const file = fileInput.files[0];



        const formData = new FormData(e.target);
        formData.append("file", file);

        const formJson = Object.fromEntries(formData.entries());

        const fileID = formJson.fileID;
        const dataKind = formJson.dataKind;
        const url = "/dataset/" + fileID + "/" + dataKind;


        try{
            fetch(url, {
                method: "PUT",
                body: formData,
            })
                .then(response => response.json())
                .then(data => {
                    alert(data.Message)
                    if (data.status == 200) {
                        this.setState({
                            filedata: this.state.filedata,
                            selectedFile: this.state.selectedFile,
                            graphs: null,
                            currentDataset: [...this.state.currentDataset, fileID.toString()],
                            queryData: []
                        });
                    }
                });
        }catch (e) {
            alert(e);
        }
    }

    removeItem(e: any) {
        const currentItems = this.state.currentDataset;
        const newItems = currentItems.filter((item: any) =>{
            return item !== e;
        })

        const fileID = e;
        const url = "/dataset/" + fileID
        this.setState({
            filedata: this.state.filedata,
            selectedFile: this.state.selectedFile,
            currentDataset: [...newItems],
            queryData: [this.state.queryData]
        })

        fetch(url, {
            method: "DELETE",
        })
            .then(response => response.json())
            .then(data => alert(data.Message))
            .catch(error => alert(error));
    }

    showInfo(e: any){
        const fileID = e;
        const url = "/dataset/" + fileID

        const deptKey = `${fileID}_dept`;
        const failKey = `${fileID}_fail`;

        const payload =
            {
                WHERE: {
                    IS: {
                        [deptKey]: "cpsc"
                    }
                },
                OPTIONS: {
                    COLUMNS: [
                        deptKey,
                    ]
                }
            }

        const payload2 =
            {
                WHERE: {
                    IS: {
                        [deptKey]: "math"
                    }
                },
                OPTIONS: {
                    COLUMNS: [
                        deptKey,
                    ]
                }
            }
        const payload3 =
            {
                WHERE: {
                    IS: {
                        [deptKey]: "poli"
                    }
                },
                OPTIONS: {
                    COLUMNS: [
                        deptKey,
                    ]
                }
            }

        const payload4 =
            {
                WHERE: {
                    IS: {
                        [deptKey]: "frst"
                    }
                },
                OPTIONS: {
                    COLUMNS: [
                        deptKey,
                    ]
                }
            }

        var query = new FormData();
        query.append( "json", JSON.stringify( payload ) );

        var query2 = new FormData();
        query2.append( "json", JSON.stringify( payload2 ) );

        var query3 = new FormData();
        query3.append( "json", JSON.stringify( payload3 ) );

        var query4 = new FormData();
        query4.append( "json", JSON.stringify( payload4 ) );
        let queryData: {dept: string, fail: number}[] = [];
        let queryData2: {dept: string, fail: number}[] = [];
        let queryData3: {dept: string, fail: number}[] = [];
        fetch(url, {
            method: "POST",
            body: query
        })
            .then(response => response.json())
            .then(data2 => {
                let content = data2.body;
                let num = content.length;
                queryData.push({dept: "cpsc", fail: num})
                queryData2.push({dept: "cpsc", fail: num})
                queryData3.push({dept: "cpsc", fail: num})

                fetch(url, {
                    method: "POST",
                    body: query2
                })
                    .then(response => response.json())
                    .then(data3 => {
                        let content = data3.body;
                        let num = content.length;
                        queryData.push({dept: "math", fail: num})
                        fetch(url, {
                            method: "POST",
                            body: query3
                        })
                            .then(response => response.json())
                            .then(data3 => {
                                let content = data3.body;
                                let num = content.length;
                                queryData2.push({dept: "poli", fail: num})
                                fetch(url, {
                                    method: "POST",
                                    body: query4
                                })
                                    .then(response => response.json())
                                    .then(data3 => {
                                        let content = data3.body;
                                        let num = content.length;
                                        queryData3.push({dept: 'frst', fail: num})

                                        this.setState({
                                            filedata: this.state.filedata,
                                            selectedFile: this.state.selectedFile,
                                            currentDataset: this.state.currentDataset,
                                            graphs: <tr>
                                                        <BarChart data={queryData}/>
                                                        <BarChart data={queryData2}/>
                                                        <BarChart data={queryData3}/>
                                                    </tr>
                                        })
                                    })
                            })
                    })
            })
    }


    render() {
        const datasets = this.state.currentDataset;
        const query = this.state.queryData
        return (
        <div>

            <form onSubmit={this.handleSubmit}>
                <input
                    name="fileID"
                    type="text"
                    className="text-black"
                />
                {/*<p>You typed: {inputValue}</p>*/}
                <input
                    id="fileInput"
                    name="fileUpload"
                    type="file"
                    onChange={this.onFileChange}
                />
                <select name="dataKind" className="text-black">
                    <option value="rooms">Rooms</option>
                    <option value="sections">Sections</option>
                </select>
                <input
                    value="Submit"
                    type="submit"
                />
            </form>
            <table className="table">
                <thead>
                <tr>
                    <th>#</th>
                    <th>Dataset Name</th>
                    <th>Action</th>
                </tr>
                </thead>
                <tbody>
                {
                    datasets.map((item, index) => {
                        let dataForChart = query[index];
                        console.log(dataForChart);
                        return (
                            <tr key={item}>
                                <th scope="row">{index + 1}</th>
                                <td>{item}</td>
                                <td>
                                    <Button onClick={(e) => this.removeItem(item)}
                                            type="button" className="btn btn-default btn-sm">
                                        Remove
                                    </Button>

                                    <Button onClick={(e) => this.showInfo(item)}
                                            type="button" className="btn btn-default btn-sm">
                                        View Insight
                                    </Button>

                                </td>
                            </tr>
                        )
                    })
                }
                </tbody>
            </table>
            {this.state.graphs}
        </div>
    );
    }
}

export default Form;