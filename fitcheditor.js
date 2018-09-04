
class Line {
	constructor(editor){
		this.editor = editor;
		this.level = 0; // greater 0 means it is a subproof
		this.lineNumber;
		this.content = null; // raw text 
		this.tokens = [];  // text tokens
		this.formula; // parsed formula if valid content exists
		this.rule;    // rule 
		this.ruleName = '';
		this.ruleDomElement = null;
		this.ruleLines = [];
		this.ruleError = null;
		this.isPremise = false;
		this.DomElement = null;
		this.formattedContent = ''; // html content XXX really needed?
		this.error = null;
		this.isDimmed = false;
	}
	copy(){
		return Object.assign({},this);
	}
	setRuleName(ruleName){
		this.ruleName = ruleName;
		const tokenType = this.getTokenTypeFromRuleName(ruleName);
		if (this.formula && this.formula.getType() === tokenType){
			this.getRuleDom().classList.add('ruleOpOk');
		}
	}
	setRule(rule){
		if (this.formula){
			this.formula.setRule(rule);
			this.checkRule();
		}
	}
	checkRule(){
		if (this.formula && this.formula.rule){
			if (this.formula.check()) {
			    this.getRuleDom().classList.add('ruleOk');
			    this.getRuleDom().classList.remove('ruleError');
			} else {
			    this.ruleError = this.formula.rule.getError();
			    console.log(this.ruleError)
			    this.getRuleDom().classList.remove('ruleOk');
			    this.getRuleDom().classList.add('ruleError');
			}
		}
	}
	getRuleDom(){
		if (this.ruleDomElement)
			return this.ruleDomElement;
		this.ruleDomElement = this.getDom().nextElementSibling;
		return this.ruleDomElement;
	}
	setRuleLines(lines){
		this.ruleLines = lines;
	}
	getTokenTypeFromRuleName(rule=null) {
	    let op = '';
	    if (!rule){
	    	op = this.ruleName.charAt(0);
	    } else {
	    	op = rule.charAt(0);
	    }
	    switch (op) {
	        case '∧' :
	            return (TokenType.AND);
	            break;
	        case '∨' :
	            return (TokenType.OR);
	            break;
	        case '¬' :
	            return (TokenType.NOT);
	            break;
	        case '→' :
	            return (TokenType.IMPL);
	            break;
	        case '∀' :
	            return (TokenType.FOR_ALL);
	            break;
	        case '∃' :
	            return (TokenType.EXISTS);
	            break;
	        case '⊥' :
	            return (TokenType.FALSE);
	            break;
	        case '↔' :
	            return (TokenType.BI_IMPL);
	            break;
	        case '⇔' :
	            return (TokenType.BI_IMPL);
	            break;
	    }
	    return -1;
	}
	setLineNumber(lineNumber){
		const element = this.getDom();
		this.lineNumber = lineNumber;
		element.dataset.lineNumber = this.padLineNumber(this.lineNumber);
	    element.id = `l${this.lineNumber}`;
	    if (element.nextElementSibling){
	    	//update rule XXX
	    	element.nextElementSibling.id = `r${this.lineNumber}`;
	    	element.nextElementSibling.dataset.lineNumber = this.lineNumber;
	    }
	    if (this.formula) {
	    	this.formula.line = lineNumber;
	    }
	    for (const token of this.tokens) {
	    	token.line = lineNumber;
		}
	}
	setContent(content){
		if (this.content === content) return;
		this.content = content;

		this.tokens = new Scanner(content,this.lineNumber).scanTokens();
		for (const token of this.tokens) {
			if(token.type === TokenType.IDENTIFIER){
				this.editor.enteredIdentifiers.add(token.lexeme);
			}
		}
		this.formula = new Parser(this.tokens).parse();
		if (!this.formula)
			this.error = fitcherror;//XXX
		else
			this.error = null;

		this.formattedContent = this.highlightTokens();

		this.getDom().textContent = this.content;
		//this.getDom().innerHTML = this.formattedContent;
		// XXX check rule

		// XXX FIXME: don't use rule selection for error messages
		if(this.error) {
			this.getDom().nextElementSibling.textContent = this.error.message;
			this.getDom().nextElementSibling.classList.add('ruleError');
		} else {
			this.getDom().nextElementSibling.textContent = '';
			this.getDom().nextElementSibling.classList.remove('ruleError');
		}

		this.editor.updateProof();
	}
	getTokenCssClass(token){
		let cssClass='';
		switch(token.type){
			case TokenType.AND:
				cssClass = 'tokenAnd';
				break;
			case TokenType.OR:
				cssClass = 'tokenOr';
				break;
			case TokenType.NOT:
				cssClass = 'tokenNot';
				break;
			case TokenType.FALSE:
				cssClass = 'tokenFalse';
				break;
			case TokenType.IMPL:
				cssClass = 'tokenImpl';
				break;
			case TokenType.BI_IMPL:
				cssClass = 'tokenBiImpl';
				break;
			case TokenType.FOR_ALL:
				cssClass = 'tokenForall';
				break;
			case TokenType.EXISTS:
				cssClass = 'tokenExists';
				break;
			case TokenType.COMMA:
				cssClass = 'tokenComma';
				break;
			case TokenType.LEFT_PAREN:
			case TokenType.RIGHT_PAREN:
				cssClass = 'tokenParen';
				break;
			case TokenType.EQUAL:
				cssClass = 'tokenEqual';
				break;
			case TokenType.IDENTIFIER:
				if (token.lexeme[0] === token.lexeme[0].toLowerCase()){
					cssClass = 'tokenTerm';
				} else {
					cssClass = 'tokenPremise'
				}
				break;
		}
		return cssClass;
	}
	dimLine(){
		this.formattedContent = this.highlightTokens(true);
		this.getDom().innerHTML = this.formattedContent;
		this.isDimmed = true;
	}
	unDimLine(){
		if (this.isDimmed){
			this.formattedContent = this.highlightTokens(false);
			this.getDom().innerHTML = this.formattedContent;
			this.isDimmed = false;
		}
	}
	highlightTokens(dim = false) {
		let content = this.content;
		let offset = 0;
		let variable = '';
		let skipToken = false;
		for (const token of this.tokens){
			if (skipToken) {
				skipToken = false;
				variable = '';
				const insertPos = token.pos + offset;
				const tokenLength = token.lexeme.length;
				content = content.substring(0,insertPos) + content.substring(insertPos+tokenLength);
				offset -= tokenLength;
				continue;
			}
			const cssClass = this.getTokenCssClass(token);
			if (cssClass) {
				let errorCssClass = '';
				let cssMainOperand = '';
				if (this.formula) {
					if (this.formula.connectives){
						for (const connective of this.formula.connectives){
							if (connective.pos == token.pos){
								cssMainOperand = 'mainOp';
							}
						}
					} else if (this.formula.connective){
						if (this.formula.connective.pos == token.pos){
							cssMainOperand = 'mainOp';
						}
					} else if (this.formula.quantifier){
						if (this.formula.quantifier.pos == token.pos){
							cssMainOperand = 'mainOp';
							variable = this.formula.variable;
							skipToken = true;
						}
					}  else if (this.formula.operator){
						if (this.formula.operator.pos == token.pos){
							cssMainOperand = 'mainOp';
						}
					}
					if (this.formula instanceof FormulaEquality) {
						cssMainOperand = '';
					}

					if (this.formula.isJustified){
						cssMainOperand = '';
					}
				} else {
					console.log('error', this.error.token)
					if (this.error && this.error.token.pos == token.pos) {
						
						errorCssClass = 'wavy';
					}
				}
				let dimCssClass = '';
				if (dim){
					dimCssClass = 'dim';
					//cssMainOperand = '';
				}
				const insert = `<span class='${cssClass} ${cssMainOperand} ${dimCssClass} ${errorCssClass}'>${token.lexeme}${variable}</span>`;
				const insertPos = token.pos + offset;
				const tokenLength = token.lexeme.length;
				content = content.substring(0,insertPos) + insert + content.substring(insertPos+tokenLength);
				offset += insert.length - tokenLength;
			}
		}
		return content;
	}
	setSyntaxHighlighting(on){
		if (on) {
			this.getDom().innerHTML = this.formattedContent;
		} else {
			this.getDom().textContent = this.content;
		}
	}
	setIsPremise(isPremise){
		if(this.isPremise == isPremise) return;
		this.isPremise = isPremise;
		if (this.isPremise) {
			this.getDom().classList.add('premise');
			this.editor.numPremises++;
			this.editor.numSteps--;
		} else {
			this.getDom().classList.remove('premise');
			this.editor.numPremises--;
			this.editor.numSteps++;
		}
		if (this.formula)
			this.formula.isPremise = isPremise;
		this.editor.updateFitchlines();
		this.editor.updateProof();
	}
	setLevel(level){
		if (this.level == level) return;
		this.level = level;
		this.getDom();
		this.DomElement.style.textIndent = (this.level * indentAmount) + 'px';//XXX FIXME
        this.DomElement.dataset.level = this.level;
        this.DomElement.style.zIndex = parseInt(100 - this.level);
        this.editor.checkFitchLines();
        this.editor.updateProof();
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
		this.undoStack = [];
		this.redoStack = [];

		this.proof = null;
	}
	addPremise(text, lineNumber=null){
		return this.addLine(text,lineNumber,true);
	}
	addLine(text, lineNumber=null, isPremise=false, level=0, highlight=false){
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
		const html = this.getLineTemplate(lineNo, text, isPremise, highlight);
		if (lineBefore) {
			lineBefore.getDom().parentNode.insertAdjacentHTML('afterend',html);
		} else {
			//insert a new line at the end
			this.editorNode.insertAdjacentHTML('beforeend',html);
		}
		
		// add line to editor
		const line = new Line(this);
		line.lineNumber = lineNo;
		this.lines.push(line);
		this.lines.sort((a,b) =>  (a.lineNumber < b.lineNumber ? -1 : 1) );
		line.setContent(text);
		line.setLevel(level);
		line.setIsPremise(isPremise);
		
		if (line.isPremise)
			this.numPremises++;
		else
			this.numSteps++;
		
		this.numberOfLines = this.lines.length;
		this.undoStack.push(['add',line, new Date()]);
		
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
	setSyntaxHighlighting(on){
		for (const line of this.lines){
			line.setSyntaxHighlighting(on);
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
		if (prevLine ) {
			if (prevLine.isPremise)
				return this.addPremise('',++lineNumber);
			return this.addLine('',++lineNumber,false,prevLine.level);
		}
		return this.addLine('',++lineNumber,false,0);
	}
	undo(){
		let timeEventBefore = 0;
		while (true){
			const event = this.undoStack.pop();
			if (!event) {
				return;
			}
			const type = event[0];
			const line = event[1];
			const date = event[2];
			const timeCurrentEvent = date.getTime();
			if (timeEventBefore !=0){
				const deltaEvents = Math.abs(timeCurrentEvent - timeEventBefore);
				if (deltaEvents > 10) {
					this.undoStack.push([type,line,date]);
					break;
				}
			}
			if (type === 'remove'){
				console.log('undo remove',line);
				const newline = this.addLine(line.content,line.lineNumber,line.isPremise,line.level,true);
				newline.setSyntaxHighlighting(true);
				this.undoStack.pop();
				this.redoStack.push(['remove',line, date]);
				this.checkFitchLines();
			} else if (type === 'add') {
				console.log('undo add',line);
				this.removeLine(line.lineNumber);
				this.undoStack.pop();
				this.redoStack.push(['add',line, date]);
			} else if (type === 'content') {
				const l = editor.getLine(line.lineNumber);
				//this.redoStack.push(['add',line, date,event[3]]);
				l.setContent(line.content);
				l.setSyntaxHighlighting(true);
				SetCaretPosition(l,event[3]);
			}
			
			timeEventBefore = timeCurrentEvent;
		}
	}
	redo(){
		let timeEventBefore = 0;
		while (true){
			const event = this.redoStack.pop();
			if (!event) {
				return;
			}
			const type = event[0];
			const line = event[1];
			const date = event[2];
			const timeCurrentEvent = date.getTime();
			if (timeEventBefore !=0){
				const deltaEvents = Math.abs(timeCurrentEvent - timeEventBefore);
				if (deltaEvents > 10) {
					this.redoStack.push([type,line,date]);
					break;
				}
			}
			if (type === 'add'){
				console.log('redo add',line);
				const newline = this.addLine(line.content,line.lineNumber,line.isPremise,line.level,true);
				newline.setSyntaxHighlighting(true);
				this.checkFitchLines();
			} else if (type === 'remove') {
				console.log('redo remove',line);
				this.removeLine(line.lineNumber);
			} else if (type === 'content') {
				console.log('redo content',line);
				const l = editor.getLine(line.lineNumber);
				l.setContent(line.content);
				l.setSyntaxHighlighting(true);
				SetCaretPosition(l,event[3]);
			}
			
			timeEventBefore = timeCurrentEvent;
		}
	}
	removeLine(lineNumber){
		if (lineNumber > this.numberOfLines || lineNumber < 1)
			return null;
		editor.activeLine = null;
		const line = this.getLine(lineNumber);

		this.undoStack.push(['remove', line, new Date()]);
		
		if (line.isPremise && this.numPremises == 1) {
			//keep at least one empty premise
			line.setContent('');
			return line.getDom();
		} 
		if (!line.isPremise && this.numSteps == 1){
			//keep at least one empty step
			line.setContent('');
			return line.getDom();			
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

		this.checkFitchLines();
		this.updateProof();
		if (lineNumber >= this.numberOfLines){
			return this.getLineByNumber(this.numberOfLines);
		}
		
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
		return document.getElementById('l'+parseInt(lineNumber));
	}
	getLineTemplate(lineNumber,content, isPremise=false, highlight=false){
		const highlightClass = highlight? ' added' : '';
		const premiseClass = isPremise ? ' premise' : '';
		return `<div class="row">
					<div data-line-number=${this.padLineNumber(lineNumber)} data-level=0 id="l${lineNumber}" class="line${premiseClass}${highlightClass}" spellcheck="false">${content}</div>
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
	updateProof() {
		console.log('update proof .... ')
		const p = new Proof();
		let prevLine = null
		let subproofs = [p];
		for (const line of this.lines) {
			let spOpened = false;
			if (prevLine && prevLine.level < line.level) {
				//open new subproof
				spOpened = true;
				const sp = new Proof();
				subproofs[prevLine.level].addSubProof(sp);
				subproofs[line.level] = sp;
				sp.line = line.lineNumber;
			} 
			if ((line.isPremise || spOpened) && line.formula){
				subproofs[line.level].addPremise(line.formula);
			} else if (line.formula) {
				subproofs[line.level].addFormula(line.formula);
			}
				
			prevLine = line;
		}
		p.getBoundVariables();
		this.proof = p;
	}
	getProof(){
		return this.proof;
	}
}



