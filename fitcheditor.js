
class Line {
	constructor(editor){
		this.editor = editor;
		this.level = 0; // greater 0 means it is a subproof
		this.lineNumber;
		this.content; // raw text 
		this.tokens;  // text tokens
		this.formula; // parsed formula if valid content exists
		this.rule;    // rule selection element
		this.isPremise = false;
		this.DomElement = null;
	}
	setLineNumber(lineNumber){
		const element = this.getDom();
		this.lineNumber = lineNumber;
		element.dataset.lineNumber = this.padLineNumber(this.lineNumber);
	    element.id = `l${this.lineNumber}`;
	    if (element.nextElementSibling){
	    	//update rule XXX
	    	element.nextElementSibling.id = `r${this.lineNumber}`;
	    }
	}
	setContent(content){
		this.content = content;
		if (content != '') {
			this.tokens = new Scanner(content,this.lineNumber).scanTokens();
			for (const token of this.tokens) {
				if(token.type === TokenType.IDENTIFIER){
					this.editor.enteredIdentifiers.add(token.lexeme);
				}
			}
			if (this.content.trim() != '')
				this.formula = new Parser(this.tokens).parse();
		}
		this.getDom().textContent = this.content;
		// XXX check rule
	}
	setIsPremise(isPremise){
		this.isPremise = isPremise;
		if (this.formula)
			this.formula.isPremise = isPremise;
		this.editor.updateFitchlines();
	}
	setLevel(level){
		this.level = level;
		this.getDom();
		this.DomElement.style.textIndent = (this.level * indentAmount) + 'px';//XXX FIXME
        this.DomElement.dataset.level = this.level;
        this.DomElement.style.zIndex = parseInt(100 - this.level);
        this.editor.checkFitchLines();
	}
	getDom(){
		if (this.DomElement)
			return this.DomElement;
		this.DomElement = document.getElementById(`l${this.lineNumber}`);
		return this.DomElement;
	}
	updateDom() {
		const element = this.getDom();
		element.dataset.lineNumber = this.padLineNumber(this.lineNumber);
	    element.id = `l${this.lineNumber}`;
	    element.textContent = this.content;
	    element.style.textIndent = (this.level * indentAmount) + 'px';//XXX FIXME
        element.dataset.level = this.level;
        element.style.zIndex = parseInt(100 - this.level);
	}
	padLineNumber(lineNumber){
		return (lineNumber + '').padStart(2,0);
	}
}

class Editor {
	constructor(){
		this.numberOfLines = 0;
		this.activeLine   = null; //dom element
		this.caretPos = 0;
		this.selectedLines = [];
		this.lines = [];
		
		this.editorNode = document.getElementById('editor');
		this.enteredIdentifiers = new Set(); //for autocomplete

		this.numPremises = 0;
		this.numSteps = 0;
	}
	addPremise(text, lineNumber=null){
		return this.addLine(text,lineNumber,true);
	}
	addLine(text, lineNumber=null, isPremise=false, level=0){
		if (lineNumber && (lineNumber > (this.numberOfLines+1) || lineNumber < 1))
			return;
		
		const lineNo = lineNumber ? lineNumber : this.numberOfLines + 1;
		let lineBefore = null;
		if (lineNo <= this.numberOfLines) {
			// increase line numbers of following lines by one
			for (const line of this.lines){
				if (line.lineNumber < lineNo){
					lineBefore = line;
					continue;
				}
				line.setLineNumber(++lineNumber);
			}
		}

		// add DOM element
		const html = this.getLineTemplate(lineNo, text,isPremise);
		if (lineBefore) {
			lineBefore.getDom().parentNode.insertAdjacentHTML('afterend',html);
		} else {
			//insert a new line at the end
			this.editorNode.insertAdjacentHTML('beforeend',html);
		}
		
		// add line to editor
		const line = new Line(this);
		line.lineNumber = lineNo;
		line.setContent(text);
		line.setLevel(level);
		line.setIsPremise(isPremise);
		this.lines.push(line);
		
		if (line.isPremise)
			this.numPremises++;
		else
			this.numSteps++;
		
		this.numberOfLines = this.lines.length;
		this.lines.sort((a,b) =>  (a.lineNumber < b.lineNumber ? -1 : 1) );
		
		console.log('added line:',line);
		return line;
	}
	updateFitchlines(){
		// reset all fitchlines
		document.querySelectorAll('.fitchline').forEach(line => line.classList.remove('fitchline'));
		let lastPremise = null;
		for (const line of this.lines){
			if (line.isPremise){
				lastPremise = line;
			}
		}
		if (lastPremise) {
			lastPremise.getDom().classList.add('fitchline');
		}
	}
	getLine(lineNumber) {
		if (lineNumber > this.numberOfLines || lineNumber < 1)
			return null;
		for(const line of this.lines){
			if (line.lineNumber == lineNumber)
				return line;
		}
	}
	addEmptyLineAfter(lineNumber){
		if (lineNumber > this.numberOfLines || lineNumber < 1)
			return;
		const prevLine = this.getLine(lineNumber);
		if (prevLine.isPremise)
			return this.addPremise('',++lineNumber);
		return this.addLine('',++lineNumber,false,prevLine.level);
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
		const line = this.getLine(lineNumber);
		if (line.isPremise && this.numPremises == 1) {
			//keep at least one empty premise
			line.setContent('');
			return line.getDom();
		} 
		if (!line.isPremise && this.numSteps == 1){
			//keep at least one empty step
			line.setContent('');
			return line;			
		}

		line.getDom().parentNode.remove();

		this.lines.splice(lineNumber-1,1);
		this.numberOfLines = this.lines.length;
		this.updateAllLineNumbers();
		if (line.isPremise){
			this.numPremises--;
		}
		else
			this.numSteps--;
		// const line = this.getLineByNumber(lineNumber);
		// if (lineNumber == 1 && this.numberOfLines == 1) {
		// 	// only remove contents if it is the only line left
		// 	line.textContent='';
		// 	return line;
		// }
		
		// line.parentNode.remove();

		// // check and update line numbers
		// this.updateLineNumbers();
		// //if last line was removed return previous line
		if (lineNumber >= this.numberOfLines){
			return this.getLineByNumber(this.numberOfLines);
		}
		this.checkFitchLines();
		// return next line 
		return this.getLineByNumber(lineNumber);
	}
	updateAllLineNumbers(){
		let i=1;
		for (const line of this.lines){
			if (line.lineNumber == i){
				i++;
				continue;
			}
			line.setLineNumber(i++);
		}
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
	getLineTemplate(lineNumber,content, isPremise=false){
		const premiseClass = isPremise ? ' premise' : '';
		return `<div class="row">
					<div data-line-number=${this.padLineNumber(lineNumber)} data-level=0 id="l${lineNumber}" class="line${premiseClass}" spellcheck="false">${content}</div>
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
	parseLine(text,lineNumber=0){
    	return new Parser(new Scanner(text.trim(),lineNumber).scanTokens()).parse();
	}
}



