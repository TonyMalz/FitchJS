

class Editor {
	constructor(){
		this.numberOfLines = 3;//XXX FIXME
		this.currentLine   = 1;
		this.caretPos = 0;
		this.selectedLines = [];
		this.lines = [];
	}
	addNewLine(){
		this.addNewLineAfter(this.currentLine);
	}
	addNewLineAfter(lineNumber){
		if (lineNumber > this.numberOfLines || lineNumber < 1)
			return;
		// get new line number
		const newLineNumber = lineNumber + 1;
		// increase line numbers of following lines by one
		if (newLineNumber <= this.numberOfLines) {
			const lines = document.getElementsByClassName('line');
	        for (let i=lineNumber; i<lines.length; i++){
	            lines[i].dataset.lineNumber = i + 2;
	            lines[i].id = 'l' + (i + 2);
	        }
		}
		// get line template
		const lineHtml = this.getLineTemplate(newLineNumber);
		// insert new line
		this.getLineByNumber(lineNumber).insertAdjacentHTML('afterend', lineHtml);

		this.numberOfLines++;
		return this.getLineByNumber(newLineNumber);

	}
	addNewLineBefore(lineNumber){
		if (lineNumber > this.numberOfLines || lineNumber < 1)
			return;
		
	}
	removeCurrentLine(){
		this.removeLine(this.currentLine)
	}
	removeLine(lineNumber){
		if (lineNumber > this.numberOfLines || lineNumber < 1 || (lineNumber == 1 && this.numberOfLines == 1))
			return null;
		let line = this.getLineByNumber(lineNumber);
		line.parentNode.removeChild(line);

		// check and update line numbers
		const lines = document.getElementsByClassName('line');
        for (let i=0; i<lines.length; i++){
            lines[i].dataset.lineNumber = i+1 ;
            lines[i].id = 'l' + (i+1);
        }
		this.numberOfLines = lines.length;
		//if last line was removed return previous line
		if (lineNumber >= this.numberOfLines){
			return this.getLineByNumber(this.numberOfLines);
		}
		// return next line
		return this.getLineByNumber(lineNumber);
	}
	getLineByNumber(lineNumber){
		return document.getElementById('l'+lineNumber);
	}
	getLineTemplate(lineNumber){
		return `<div data-line-number=${lineNumber} id="l${lineNumber}" class="line" spellcheck="false">Line ${lineNumber}</div>`
	}
	
}



