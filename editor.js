

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
	            lines[i].dataset.lineNumber = this.padLineNumber(i + 2);
	            lines[i].id = 'l' + (i + 2);
	        }
		}
		// get line template
		const lineHtml = this.getLineTemplate(newLineNumber);
		// insert new line
		//this.getLineByNumber(lineNumber).insertAdjacentHTML('afterend', lineHtml);
		this.getLineByNumber(lineNumber).parentNode.insertAdjacentHTML('afterend', lineHtml);

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
		if (lineNumber > this.numberOfLines || lineNumber < 1)
			return null;
		const line = this.getLineByNumber(lineNumber);
		if (lineNumber == 1 && this.numberOfLines == 1) {
			// only remove contents if it is the only line left
			line.textContent='';
			return line;
		}
		
		line.parentNode.remove();

		// check and update line numbers
		this.updateLineNumbers();
		//if last line was removed return previous line
		if (lineNumber >= this.numberOfLines){
			return this.getLineByNumber(this.numberOfLines);
		}
		// return next line 
		return this.getLineByNumber(lineNumber);
	}
	updateLineNumbers(){
		const lines = document.getElementsByClassName('line');
        for (let i=0; i<lines.length; i++){
            lines[i].dataset.lineNumber = this.padLineNumber(i+1) ;
            lines[i].id = 'l' + (i+1);
            if (lines[i].nextElementSibling){
            	lines[i].nextElementSibling.dataset.lineNumber = (i+1);
            	lines[i].nextElementSibling.id = 'r' + (i+1);
            }
        }
        
        this.numberOfLines = lines.length;
	}
	getLineByNumber(lineNumber){
		return document.getElementById('l'+lineNumber);
	}
	getLineTemplate(lineNumber){
		return `<div class="row">
				<div data-line-number=${this.padLineNumber(lineNumber)} data-level=0 id="l${lineNumber}" class="line" spellcheck="false"></div>
		        <div class="rule" contenteditable="true" data-line-number=${lineNumber} id="r${lineNumber}"  placeholder="add rule" spellcheck="false"></div>
		        </div>`
	}
	padLineNumber(lineNumber){
		return (lineNumber + '').padStart(2,0);
	}
	checkFitchLines(){
		//XXX build tree structure
		let lastPremise = null;
		let prevLine = null;
		document.querySelectorAll('.fitchline').forEach(line => line.classList.remove('fitchline'));
		for (const line of document.querySelectorAll('.line')) {
			if (line.classList.contains('premise')){
				if (line.dataset.level == 0){
					lastPremise = line;
					continue;
				}
				// remove premise class if line is not in level 0
				line.classList.remove('premise');
			}
			if(!prevLine){
				
				if (lastPremise) {
					if (0 < line.dataset.level){
						line.classList.add('fitchline');
						line.style.backgroundPositionX = line.style.textIndent;
					}
				}
				prevLine = line;
				continue;
			}
			// subproofs
			const levelPrev = prevLine.dataset.level;
			if (levelPrev < line.dataset.level){
				line.classList.add('fitchline');
				line.style.backgroundPositionX = line.style.textIndent;
				line.style.backgroundColor = '#2e2e2e';
			}
			prevLine = line;
		}
		if (lastPremise){
			lastPremise.classList.add('fitchline');
		}
	}
}



