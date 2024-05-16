import Section from "./Section";
import Room from "./Room";
import {InsightError} from "./IInsightFacade";

export class WildcardsMethods {
	public doWildcards(SComparator: string, sfield: string, comparisonValue: string, course: Section | Room): boolean {
		const leftRegex: RegExp = /^\*[^*]+$/;
		const rightRegex: RegExp = /^[^*]+\*$/;
		const bothRegex: RegExp = /^\*[^*]+\*$/;
		let wildcardType = "";

		const inputStringSplit: string[] = comparisonValue.split("*");
		const numberOfAsterisks = inputStringSplit.length - 1;

		// handle more than two asterisks (not valid)
		if(numberOfAsterisks > 2) {
			throw new InsightError("wildcard has more than two asterisks");
		}
		// handle two asterisks
		if (numberOfAsterisks === 2) {
			// first check if just two asterisks
			if(inputStringSplit[0].length === 0 && inputStringSplit[1].length && inputStringSplit[2].length) {
				// TODO: needs to include all instances
			}
			// check if comparisonValue follows valid wildcard spec for two asterisks
			if(bothRegex.test(comparisonValue)){
				wildcardType = "both";
				return this.actuallyPerformWildcards(SComparator, sfield, comparisonValue, course, wildcardType);
			} else {
				throw new InsightError("Double asterisk does not conform to valid wildcard specifications");
			}
		}
		// handle one asterisk
		if(numberOfAsterisks === 1) {
			// handle left side asterisk
			// TODO: if inputstring is only "*" then should include everything
			if(leftRegex.test(comparisonValue)){
				wildcardType = "left";
				return this.actuallyPerformWildcards(SComparator, sfield, comparisonValue, course, wildcardType);
			} else if(rightRegex.test(comparisonValue)) {
				wildcardType = "right";
				return this.actuallyPerformWildcards(SComparator, sfield, comparisonValue, course, wildcardType);
			} else {
				// one asterisk but not on left or right side, must be in middle therefore invalid
				throw new InsightError("one asterisk does not conform to valid wildcard specifications");
			}
		}
		// we only enter this method if comparisonValue contains an asterisk so code will never reach this line
		throw new InsightError("something went wrong with wildcards");
	}

	public actuallyPerformWildcards(SComparator: string, sfield: string, comparisonValue:
		string, course: Section | Room, wildcardType: string): boolean {
		const inputstringWithoutAsterisk = comparisonValue.replace(/\*/g, "").trim();
		let currentCourseComparison = String(course[sfield]);

		if(wildcardType === "both" && (currentCourseComparison).includes(inputstringWithoutAsterisk)) {
			// working with both asterisks type, and our string is found somewhere in the current sfield being compared
			return true;
		} else if(wildcardType === "left" && currentCourseComparison.substring(currentCourseComparison.length -
			inputstringWithoutAsterisk.length) === inputstringWithoutAsterisk) {
			// handle asterisk on left side
			return true;
		} else if(wildcardType === "right" && currentCourseComparison.substring(0, inputstringWithoutAsterisk.length)
			=== inputstringWithoutAsterisk) {
			// handle right asterisk
			return true;
		}
		return false;
	}
}
