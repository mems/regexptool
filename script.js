"use strict";
			
var RegExpFlag = Object.freeze({
	GLOBAL: "g",
	IGNORE_CASE: "i",
	MULTILINE: "m"
});
			
/*
Inspired from Tamarin String().replace()
See http://hg.mozilla.org/tamarin-central/file/fbecf6c8a86f/core/RegExpObject.cpp RegExpObject::replace
I identify one bug in this implementation when you use "capture1".replace(/(capture1)/g, "$01") will return "capture11" instead of "capture1" (see the var digitLength)
				
Others implementations : 
http://code.google.com/p/v8/source/browse/trunk/src/string.js#318
https://github.com/mozilla/rhino/blob/master/src/org/mozilla/javascript/regexp/RegExpImpl.java#L351
https://github.com/mozilla/rhino/blob/master/src/org/mozilla/javascript/regexp/NativeRegExpCtor.java
http://hg.mozilla.org/mozilla-central/file/06935f2db267/js/src/jsstr.cpp#l2277 http://mxr.mozilla.org/mozilla-central/source/js/src/jsstr.cpp#2277
				
Also it convert "$nn" to "$n" when "nn" < 10 (ex.: "05"->"5")
*/
var ReplacePatternSlicer = function ReplacePatternSlicer(str){
	this._source = str;
}
ReplacePatternSlicer.prototype = Object.seal({
	_source: null,
	_bufferLength: 0,
	_bufferPos: 0,
	_slices: null,
	_captureCount: 0,
	_charIndex: 0,
	get source(){
		return this._source;
	},
	_addBuffer: function(){
		if(this._bufferLength > 0){
			this._slices.push(this._source.substr(this._bufferPos, this._bufferLength));
			//clear buffer
			this._bufferLength = 0;
		}
	},
	_addSlice: function(slice, offset){
		this._addBuffer();
		if(slice != undefined){
			this._slices.push(slice);
			this._charIndex += offset;
			this._bufferPos = this._charIndex;
		}
	},
	_next: function(count){
		if(count != undefined){
			this._charIndex += count;
			this._bufferLength += count;
		}else{
			this._charIndex++;
			this._bufferLength++;
		}
	},
	_hasMoreChars: function(count){
		return this._charIndex + count < this._source.length;
	},
	/*
	TODO: check End Of String
	*/
	_parseHexaString: function(str, startAt, length){
		if(startAt == undefined){
			startAt = 0;
		}
		if(length == undefined){
			length = str.length;
		}
		var charIndex = 0,
			char,
			value = 0,
			offset;
		for(; charIndex < length; charIndex++){
			char = str.charAt(startAt + charIndex);
			offset = length - 1 - charIndex;
			//test hexa
			if(char >= "0" && char <= "9"){
				value |= (char - "0") << 4 * offset;
			}else if(char >= "A" && char <= "D"){
				value |= (10 + char.charCodeAt() - 65) << 4 * offset;//(65 = "A")
			}else if(char >= "a" && char <= "d"){
				value |= (10 + char.charCodeAt() - 97) << 4 * offset;//(97 = "a")
			}else{
				value = NaN;
				break;
			}
		}
					
		return value;
	},
	/*
	TODO: check End Of String
	*/
	_parseOctalString: function(str, startAt, length){
		if(startAt == undefined){
			startAt = 0;
		}
		if(length == undefined){
			length = str.length;
		}
		var charIndex = 0,
			char,
			value = 0,
			offset;
		for(; charIndex < length; charIndex++){
			char = str.charAt(startAt + charIndex);
			offset = length - 1 - charIndex;
			//test octal
			if(char >= "0" && char <= "7"){
				value |= (char - "0") << 3 * offset;
			}else{
				value = NaN;
				break;
			}
		}
					
		return value;
	},
	slice: function(captureCount){
		var slices = this._slices;
		var source,
			char0, char1, char2,
			charCode,
			charCount,
			//capture index is between 1 and captureCount (inclusive)
			captureIndex,
			digitLength,
			bufferPos,
			bufferLength,
			pattern,
			escapedChars,
			test;
		if(this._slices != null && captureCount == this._captureCount){
			return this._slices;
		}else{
			slices = this._slices = [];
			source = this._source;
			this._bufferPos = 0;
			this._bufferLength = 0;
			this._charIndex = 0;
			charCount = source.length;
			escapedChars = {
				//http://es5.github.com/#x7.8.4
				//http://www.codecodex.com/wiki/Escape_sequences_and_escape_characters
				//http://mathiasbynens.be/notes/javascript-escapes
				"\\\\": "\\",//backslash
				"\\b": "\b",//backspace
				"\\f": "\f",//form feed
				"\\n": "\n",//line feed
				"\\r": "\r",//carriage return
				"\\t": "\t",//horizontal tab
				"\\v": "\v"//vertical tab
			};
		}
					
		while(this._charIndex < charCount){
			char0 = source.charAt(this._charIndex);
			//if start with $ and has one more char
			if(char0 == "$" && this._hasMoreChars(1)){
				//next char
				char1 = source.charAt(this._charIndex + 1);
				switch(char1){
					//$n or $nn
					case "0":
					case "1":
					case "2":
					case "3":
					case "4":
					case "5":
					case "6":
					case "7":
					case "8":
					case "9":{
						//has one more char again and is 0 to 9
						char2 = source.charAt(this._charIndex + 2);
						if(this._hasMoreChars(2) && char2 >= "0" && char2 <= "9"){
							captureIndex = 10 * (char1 - "0") + (char2 - "0");
							digitLength = 2;
							if(captureIndex > captureCount){
								//juste take account one digit
								captureIndex = char1 - "0";
								digitLength = 1;
							}
						}else{
							captureIndex = char1 - "0";
							digitLength = 1;
						}
						if(captureIndex >= 1 && captureIndex <= captureCount){
							//replace $01 to $1
							this._addSlice("$" + captureIndex, 1 + digitLength);
						}
						//not valid captureIndex
						else{
							this._next();
						}
						break;	
					}
					//others
					case "$":
					case "&":
					case "`":
					case "'":{
						pattern = source.substr(this._charIndex, 2);
						this._addSlice(pattern == "$$" ? "$" : pattern, 2);
						break;
					}
					default:
						this._next();
						break;
				}
							
			}
			//TODO implements it completely
			//Escaped chars
			//Ecma-262 7.8.4
			//if start with \ and has one more char
			else if(char0 == "\\" && this._hasMoreChars(1)){
				char1 = source.charAt(this._charIndex + 1);
				pattern = source.substr(this._charIndex, 2);
				//search in predefineds
				if(pattern in escapedChars){
					this._addSlice(escapedChars[pattern], 2);
				}
				//UnicodeEscapeSequence "\u0020"
				else if(char1 == "u" && this._hasMoreChars(5)){
					charCode = this._parseHexaString(source, this._charIndex + 2, 4);
					if(isNaN(charCode)){
						if(/*replace all unknown escape sequence like "\z" to "z" */true){
							this._addSlice(char1, 2);
						}else{
							this._next(2);
						}
					}else{
						this._addSlice(String.fromCharCode(charCode), 6);
					}
				}
				//HexEscapeSequence
				else if(char1 == "x" && this._hasMoreChars(3)){
					charCode = this._parseHexaString(source, this._charIndex + 2, 2);
					if(isNaN(charCode)){
						if(/*replace all unknown escape sequence like "\z" to "z" */true){
							this._addSlice(char1, 2);
						}else{
							this._next(2);
						}
					}else{
						this._addSlice(String.fromCharCode(charCode), 4);
					}
				}else if(char1 >= "0" && char1 <= "7"){//octal digit between 0 and 377
					charCode = this._parseOctalString(source, this._charIndex + 1, 3);
					if(isNaN(charCode)){
						//"\0" null character
						if(char1 == "0"){
							this._addSlice("\0", 2);
						}else if(/*replace all unknown escape sequence like "\z" to "z" */true){
							this._addSlice(char1, 2);
						}else{
							this._next(2);
						}
					}else{
						this._addSlice(String.fromCharCode(charCode), 4);
					}
				}else{
					if(/*replace all unknown escape sequence like "\z" to "z" */true){
						this._addSlice(char1, 2);
					}else{
						this._next(2);
					}
				}
			}else{
				this._next();	
			}
		}
		this._addBuffer();
					
		return slices;
	}
});
Object.freeze(ReplacePatternSlicer);
			
var RegExpTool = function RegExpTool(doc){
	doc.addEventListener("DOMContentLoaded", this._domLoadedListener.bind(this), false);
}
RegExpTool.prototype = Object.seal({
	_regExpSrc: "",
	_regExp: null,
	_globalOpt: false,
	_caseOpt: false,
	_lineOpt: false,
	_replaceOpt: false,
	_extractOpt: false,
	_replacePattern: null,
	_text: "",
	_modeElm: null,
	_regExpElm: null,
	_globalOptElm: null,
	_caseOptElm: null,
	_lineOptElm: null,
	_replacePatternElm: null,
	_replacePatternSlicer: null,
	_textElm: null,
	_outputElm: null,
	_matches: [],
	_domLoadedListener: function(event){
					
		this._regExpElm = document.getElementById("regexp");
		this._regExpElm.addEventListener("change", this._inputListener.bind(this), false);
		this._regExpElm.addEventListener("input", this._inputListener.bind(this), false);
		this._setByInput(this._regExpElm);
					
		this._globalOptElm = document.getElementById("global-opt");
		this._globalOptElm.addEventListener("change", this._inputListener.bind(this), false);
		this._globalOptElm.addEventListener("input", this._inputListener.bind(this), false);
		this._setByInput(this._globalOptElm);
					
		this._caseOptElm = document.getElementById("case-opt");
		this._caseOptElm.addEventListener("change", this._inputListener.bind(this), false);
		this._caseOptElm.addEventListener("input", this._inputListener.bind(this), false);
		this._setByInput(this._caseOptElm);
					
		this._lineOptElm = document.getElementById("line-opt");
		this._lineOptElm.addEventListener("change", this._inputListener.bind(this), false);
		this._lineOptElm.addEventListener("input", this._inputListener.bind(this), false);
		this._setByInput(this._lineOptElm);
					
		this._replaceOptElm = document.getElementById("replace-opt");
		this._replaceOptElm.addEventListener("change", this._inputListener.bind(this), false);
		this._replaceOptElm.addEventListener("input", this._inputListener.bind(this), false);
		this._setByInput(this._replaceOptElm);
					
		this._extractOptElm = document.getElementById("extract-opt");
		this._extractOptElm.addEventListener("change", this._inputListener.bind(this), false);
		this._extractOptElm.addEventListener("input", this._inputListener.bind(this), false);
		this._setByInput(this._extractOptElm);
					
		this._replacePatternElm = document.getElementById("replace-pattern");
		this._replacePatternElm.addEventListener("change", this._inputListener.bind(this), false);
		this._replacePatternElm.addEventListener("input", this._inputListener.bind(this), false);
		this._setByInput(this._replacePatternElm);
					
		this._textElm = document.getElementById("text");
		this._textElm.addEventListener("change", this._inputListener.bind(this), false);
		this._textElm.addEventListener("input", this._inputListener.bind(this), false);
		this._setByInput(this._textElm);
					
		this._outputElm = document.getElementById("output");
					
		this.exec();
	},
	/*
	Replace all br in given element with a textnode contains "\n"
	Usefull when you want the text of a node via textContent. Basically textContent remove all tags include br, but dont replace these ones by "\n".
	*/
	_replaceAllBr: function(element){
		var nodes = element.getElementsByTagName("br"), node, textNode;
		//nodes is a living list (updated when a node appears or disappears)
		while(nodes.length > 0){
			node = nodes[0];
			textNode = textNode != null ? textNode.cloneNode() : document.createTextNode("\n");
			node.parentNode.replaceChild(textNode, node);
		}
	},
	_setByInput: function(element){
		var regExpUpdateRequired = false;
		var patternTokenizer;
		var flags = "";
		var regExpError = null;
					
		switch(element){
			case this._regExpElm:
				this._regExpSrc = this._regExpElm.value;
				regExpUpdateRequired = true;
				break;
			case this._globalOptElm:
				this._globalOpt = this._globalOptElm.checked;
				regExpUpdateRequired = true;
				break;
			case this._caseOptElm:
				this._caseOpt = this._caseOptElm.checked;
				regExpUpdateRequired = true;
				break;
			case this._lineOptElm:
				this._lineOpt = this._lineOptElm.checked;
				regExpUpdateRequired = true;
				break;
			case this._replaceOptElm:
				this._replaceOpt = this._replaceOptElm.checked;
				break;
			case this._extractOptElm:
				this._extractOpt = this._extractOptElm.checked;
				break;
			case this._replacePatternElm:
				this._replacePattern = new ReplacePatternSlicer(this._replacePatternElm.value);
				break;
			case this._textElm:
				this._replaceAllBr(this._textElm);
				this._text = this._textElm.textContent;
				break;
		}
					
		//End here if no updated required
		if(!regExpUpdateRequired || this._regExp == null && element != this._regExpElm){
			return;
		}
					
		if(this._globalOpt){
			flags += RegExpFlag.GLOBAL;
		}
		if(!this._caseOpt){
			flags += RegExpFlag.IGNORE_CASE;
		}
		if(this._lineOpt){
			flags += RegExpFlag.MULTILINE;
		}
					
		if(this._regExpSrc == ""){
			regExpError = new Error("empty field");
			regExpError.name = "CustomValidityError";
		}else{
			try{
				this._regExp = new RegExp(this._regExpSrc, flags);
			}catch(error){
				regExpError = error;
			}
		}					
		if(regExpError != null){
			this._regExp = null;
			this._regExpElm.setCustomValidity(regExpError.message);
		}else{
			//erase the validity message
			this._regExpElm.setCustomValidity("");
		}
	},
	_inputListener: function(event){
		this._setByInput(event.currentTarget);					
		this.exec();
	},
	_updateMatches: function(){
		var regExp = this._regExp,
			str = this._text,
			result,
			matches = this._matches;
		//reset matches array
		matches.length = 0;
					
		if(regExp == null){
			//End
			return;
		}
					
		//reset lastIndex
		regExp.lastIndex = 0;
					
		//If not iterative regexp, only match first one
		if(!regExp.global){
			result = regExp.exec(str);
			if(result != null){
				matches.push(result);
			}
			//End
			return;
		}
					
		while(true){
			result = regExp.exec(str);
			if(result != null){
				matches.push(result);
			}else{
				break;
			}
		}
	},
	_updateHighlights: function(){
		var textElm = this._textElm,
			matches = this._matches,
			nodes = document.createDocumentFragment(),
			node,
			matchIndex,
			matchCount = matches.length,
			text = this._text,
			match,
			matchStr,
			matchStartIndex,
			matchLength,
			captureCount,
			title,
			captureIndex;
					
		//TODO save selection
					
		//Remove current content
		while (textElm.firstChild) {
			textElm.removeChild(textElm.firstChild);
		}
					
		if(matchCount >= 1){
			//add portion of the string that precedes the first match 
			nodes.appendChild(document.createTextNode(text.substring(0, matches[0].index)));
		}else{
			//Add all
			nodes.appendChild(document.createTextNode(text));
		}
					
		for(matchIndex = 0; matchIndex < matchCount; matchIndex++){
			match = matches[matchIndex];
			matchStr = match[0];
			matchStartIndex = match.index;
			matchLength = matchStr.length;
			captureCount = match.length - 1;
			node = document.createElement("span");
			node.className = "match";
			title = "match: " + matchStr + "\nindex: " + matchStartIndex + "\nlength: " + matchLength + "\ngroups: " + captureCount;
			for(captureIndex = 0; captureIndex < captureCount; captureIndex++){
				title += "\n\tgroup " + captureIndex + ": " + match[captureIndex + 1];
			}
			node.title = title;
			node.appendChild(document.createTextNode(matchStr));
			nodes.appendChild(node);
						
			if(matchIndex < matchCount - 1){
				//add portion of the string that follows the match to the next one
				nodes.appendChild(document.createTextNode(text.substring(matchStartIndex + matchLength, matches[matchIndex + 1].index)));
			}else{
				//add portion of the string that follows the last match
				nodes.appendChild(document.createTextNode(text.substring(matchStartIndex + matchLength)));
			}
		}
					
		this._textElm.appendChild(nodes);
		//TODO restore selection
	},
	//look like the same as _updateHighlights() but it's far more complex
	_updateOutput: function(){
		var outputElm = this._outputElm,
			matches = this._matches,
			replace = this._replaceOpt,
			extract = this._extractOpt,
			replacePattern,
			index,
			nodes = document.createDocumentFragment(),
			node,
			matchCount = matches.length,
			text = this._text,
			textLength = text.length,
			match,
			matchStr,
			matchIndex,
			matchLength,
			nextMatchIndex,
			captureCount,
			capture,
			slices = [],
			slice,
			sliceCount,
			//knowns default patterns
			patterns = {},
			subIndex,
			subNode;
					
		//Remove current content
		while (outputElm.firstChild) {
			outputElm.removeChild(outputElm.firstChild);
		}
					
		//one or more matches
		if(matchCount >= 1){
			//first match
			match = matches[0];
			captureCount = match.length - 1;
			slices = this._replacePattern.slice(captureCount);
			replacePattern = this._replacePattern.source;//slices.join("");
			sliceCount = slices.length;
						
			//only if match don't start at index 0
			if(match.index > 0 && !extract){
				//add portion of the string that precedes the first match 
				nodes.appendChild(document.createTextNode(text.substring(0, match.index)));
			}
		}else if(!extract){
			//Add all
			nodes.appendChild(document.createTextNode(text));
		}
					
		//for each matches
		for(index = 0; index < matchCount; index++){
			match = matches[index];
			matchStr = match[0];
			matchIndex = match.index;
			matchLength = matchStr.length;
			nextMatchIndex = index < matchCount - 1 ? matches[index + 1].index : text.length;
			captureCount = match.length - 1;
			node = document.createElement("span");
			node.className = "match";
			node.title = "match: " + matchStr + "\nindex: " + matchIndex + "\npattern: " + replacePattern + "\ncaptures: " + captureCount;
			if(replace){
				//default patterns
				patterns["$`"] = text.substring(0, matchIndex);
				patterns["$'"] = text.substring(matchIndex + matchLength, textLength);
				patterns["$&"] = matchStr;
							
				for(subIndex = 0; subIndex < captureCount; subIndex++){
					capture = match[subIndex + 1];
					patterns["$" + (subIndex + 1)] = capture;
					node.title += "\n\tcapture" + subIndex + " ($" + (subIndex + 1) + "): " + capture;
				}
							
				for(subIndex = 0; subIndex < sliceCount; subIndex++){
					slice = slices[subIndex];
					if(slice in patterns){
						subNode = document.createElement("span");
						subNode.className = "capture";
						//subNode.title = "replace: " + replacePattern + "\n\tcapture: " + patterns[slice] + "\n\tpattern: " + slice;
						subNode.appendChild(document.createTextNode(patterns[slice]));
						node.appendChild(subNode);
					}else{
						node.appendChild(document.createTextNode(slice));
					}
				}
			}else{
				for(subIndex = 0; subIndex < captureCount; subIndex++){
					node.title += "\n\tcapture" + subIndex + ": " + match[subIndex + 1];
				}
							
				node.appendChild(document.createTextNode(matchStr));
			}
			nodes.appendChild(node);
						
			if(!extract){
				//add portion of the string that follows the match to the next one (or to the end)
				nodes.appendChild(document.createTextNode(text.substring(matchIndex + matchLength, nextMatchIndex)));
			}
		}
					
		this._outputElm.appendChild(nodes);
	},
	exec: function(){
		this._updateMatches();
		this._updateHighlights();
		this._updateOutput();
	}
});
Object.freeze(RegExpTool);
		
/**
Main
**/
			
var regExpTool = new RegExpTool(document);