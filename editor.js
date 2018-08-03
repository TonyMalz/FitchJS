

class Editor {
	constructor(){
		this.numberOfLines = 3;//XXX FIXME
		this.currentLine   = 1;
		this.caretPos = 0;
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

		// decrease line numbers of following lines by one
		const lines = document.getElementsByClassName('line');
        for (let i=lineNumber; i<lines.length; i++){
            lines[i].dataset.lineNumber = i ;
            lines[i].id = 'l' + i;
        }
		let line = this.getLineByNumber(lineNumber);
		line.parentNode.removeChild(line);
		//if last line was removed return previous line
		if (lineNumber == this.numberOfLines){
			return this.getLineByNumber(--this.numberOfLines);
		}
		this.numberOfLines--;
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

const editor = new Editor();

function handleKeydown(event) {
    const that = event.target;
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    const lineNo = parseInt(that.dataset.lineNumber);
    switch (event.key) {
        case "ArrowDown":
          console.log('down',lineNo);
          if (lineNo < editor.numberOfLines) {
            const next = document.getElementById('l'+(lineNo + 1));
            SetCaretPosition(next,caretPos);
          }
          break;
        case "ArrowUp":
          console.log('up');
          if (lineNo > 1) {
            const next = document.getElementById('l'+(lineNo - 1));
            SetCaretPosition(next,caretPos);
          }
          break;
        case "Enter":
          console.log('Enter');
          // that.insertAdjacentHTML('afterend',this.getLineTemplate((lineNo+1)));
          // let next = document.getElementById('l'+(lineNo + 1));
          // lastLineNo = Math.max(lastLineNo, (lineNo + 1));
          
          const next = editor.addNewLineAfter(lineNo);
          SetCaretPosition(next,caretPos);
          break;
        case "Delete":
          console.log('Delete');
          {
          	const next = editor.removeLine(lineNo);
          	if (next !== null)
          		SetCaretPosition(next,caretPos);
          }
          break;
        default:
          return; // Quit when this doesn't handle the key event.
    }

    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
}



window.addEventListener("load", function(){
    const ed = document.getElementById('editor');
    ed.addEventListener("keydown", handleKeydown , true);
    ed.addEventListener('keyup', showCaretPos, false);
    ed.addEventListener("mousedown", handleMouse , false);
    ed.addEventListener('mouseup', handleMouse, false);
}, false);