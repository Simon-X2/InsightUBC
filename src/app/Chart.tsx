
// import * as d3 from "d3";
// import { useEffect, useRef } from "react";
//
// type Props = {
//     list: any[]
// }
//
// const Barchart = ({data}) => {
//     const ref = useRef(null);
//     let queryData = data as [{dept: string, fail: number}];
//     console.log(queryData);
//
//     useEffect(() => {
//         // set the dimensions and margins of the graph
//         const margin = { top: 30, right: 30, bottom: 70, left: 60 },
//             width = 460 - margin.left - margin.right,
//             height = 300 - margin.top - margin.bottom;
//
//        // let queryData = [{dept: "math", pass: 134},{dept: "bio", pass: 20},{dept: "cs", pass: 34}]
//         // Clear the existing SVG to avoid duplications
//
//        const chart = d3.select(ref.current);
//
//         // Clear the existing SVG to avoid duplications
//         chart.selectAll("*").remove();
//
//         const svg = chart.append("svg")
//             .attr("width", width + margin.left + margin.right)
//             .attr("height", height + margin.top + margin.bottom)
//             .append("g")
//             .attr("transform", `translate(${margin.left},${margin.top})`);
//
//             const x = d3
//                 .scaleBand()
//                 .range([0, width])
//                 .domain(queryData.map((d) => d.dept))
//                 .padding(0.2);
//             svg
//                 .append("g")
//                 .attr("transform", `translate(0, ${height})`)
//                 .call(d3.axisBottom(x))
//                 .selectAll("text")
//                 .attr("transform", "translate(-10,0)rotate(-45)")
//                 .style("text-anchor", "end");
//
//
//             // Add Y axis
//             const y = d3.scaleLinear().domain([0, 300]).range([height, 0]);
//             svg.append("g").call(d3.axisLeft(y));
//
//             // Bars
//             svg
//                 .selectAll("mybar")
//                 .data(queryData)
//                 .join("rect")
//                 .attr("x", (d) => x(d.dept))
//                 .attr("y", (d) => y(d.fail))
//                 .attr("width", x.bandwidth())
//                 .attr("height", (d) => height - y(d.fail))
//                 .attr("fill", "#5f0f40");
//     }, [data]);
//
//     return <svg width={460} height={400} id="barchart" ref={ref} />;
// };

// export default Barchart;


import * as d3 from "d3";
import { useEffect, useRef } from "react";

type Props = {
    data: { dept: string; fail: number; }[];
}

const BarChart = ({ data }: Props) => {
    // console.log(data);
    const ref = useRef<SVGSVGElement | null>(null);
    let course = data[1].dept;

    useEffect(() => {
        if(!ref.current) return; // Ensure the ref is attached

        const margin = { top: 30, right: 30, bottom: 70, left: 60 },
            width = 460 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        // Select the container and clear it to avoid duplications
        const svg = d3.select(ref.current);
        svg.selectAll("*").remove(); // Clear any existing content

        const content = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Set up the scales
        const x = d3.scaleBand()
            .range([0, width])
            .domain(data.map(d => d.dept))
            .padding(0.2);

        content.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end");

        // Y axis
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.fail) ?? 100]) // Use dynamic max or a default
            .range([height, 0]);

        content.append("g").call(d3.axisLeft(y));

        // Bars
        content.selectAll(".bar")
            .data(data)
            .join("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.dept)!)
            .attr("y", d => y(d.fail))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.fail))
            .attr("fill", "#5f0f40");

        content.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .style("fill", "white")
            .text(`Number of courses offered: cpsc vs ${course} Graph`);


    }, [data]); // Dependency array ensures effect runs when data changes

    return <svg width={460} height={400} ref={ref} />;
};

export default BarChart;