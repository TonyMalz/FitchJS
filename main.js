/*
style="-webkit-user-select:text;" is needed for iPad

*/

const editor = new Editor();

function getCaretCharacterOffsetWithin(element) {
  let caretOffset = 0;
  const doc = element.ownerDocument || element.document;
  const win = doc.defaultView || doc.parentWindow;
  let sel;
  if (typeof win.getSelection !== "undefined") {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      let range = win.getSelection().getRangeAt(0);
      let preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
  } else if ((sel = doc.selection) && sel.type != "Control") {
    let textRange = sel.createRange();
    let preCaretTextRange = doc.body.createTextRange();
    preCaretTextRange.moveToElementText(element);
    preCaretTextRange.setEndPoint("EndToEnd", textRange);
    caretOffset = preCaretTextRange.text.length;
  }
  return caretOffset;
}

function getCaretPosition() {
  if (window.getSelection && window.getSelection().getRangeAt) {
    let range = window.getSelection().getRangeAt(0);
    let selectedObj = window.getSelection();
    let rangeCount = 0;
    let childNodes = selectedObj.anchorNode.parentNode.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      if (childNodes[i] == selectedObj.anchorNode) {
        break;
      }
      if (childNodes[i].outerHTML)
        rangeCount += childNodes[i].outerHTML.length;
      else if (childNodes[i].nodeType == 3) {
        rangeCount += childNodes[i].textContent.length;
      }
    }
    return range.startOffset + rangeCount;
  }
  return -1;
}


function showCaretPos(event) {
  let el = event.target;
  let caretPosEl = document.getElementById("caretPos");
  editor.caretPos = getCaretPosition();
  const line = editor.selectedLines[0].dataset.lineNumber;
  caretPosEl.textContent = "Caret position in line: " + line + " at index: " + editor.caretPos; //getCaretCharacterOffsetWithin(el);
}


let mousedown = null;
let activeLine = null;
function handleMouse(event) {
    console.log(event)
    const that = event.target;
    if (tooltipElem) {
        tooltipElem.remove();
        tooltipElem = null;
    }
    switch (event.type) {
        case 'mousedown':
            editor.selectedLines = null;
            mousedown = event;
            if(activeLine !== null){
                activeLine.contentEditable = 'false';
            }
            break;
        case 'mouseup':
            if (mousedown !== null && Math.abs(mousedown.clientX - event.clientX) < 3){
                // only update if a line was selected
                if (that.classList.contains('line') || that.parentNode.classList.contains('line')){
                    that.contentEditable = 'true';
                    that.focus();
                    editor.selectedLines = [that];
                    console.log(editor.selectedLines)
                    const sel = window.getSelection();
                    if (sel.type === "Caret") {
                        const range = sel.getRangeAt(0);
                        editor.caretPos = range.startOffset;
                        console.log(editor.caretPos)
                    }
                    activeLine = that;
                }
            }
            const sel = window.getSelection()
            if (sel.type === 'Range') {
                const range = sel.getRangeAt(0)
                const fragments = range.cloneContents()
                const nodeList= fragments.querySelectorAll('.line')
                if (nodeList.length > 0)
                    editor.selectedLines = nodeList;
                else {
                    editor.selectedLines = [that.closest('.line')];
                }
                console.log(editor.selectedLines)
            }
            break;
    }
}

const sugg = new Map();
sugg.set("∧ And", '∧');
sugg.set("v Or", '∨');
sugg.set("¬ Not", '¬');
sugg.set("∀ For All", '∀');
sugg.set("-> Implication", '→');
sugg.set("<-> Bi-Implication", '↔');
sugg.set("∃ Exists", '∃');
sugg.set("⊥ Bottom", '⊥');
sugg.set("⊥ False", '⊥');
function suggest(search) {
     // escape brackets
    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // enclose search term in brackets
    const regex = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
    console.log(search,regex)

    const results = new Map();
    for (const [matchstring,token] of sugg){
        if (regex.test(matchstring))
            results.set(token,[matchstring,matchstring.replace(regex,'<b>$1</b>')]);
    }
    console.log(results)
    return results;
}


let currentTokenLeft = 0;
let tooltipElem;
let tabProcessed = false;
let enterProcessed = false;
let selectionIndex = 0;
let lineKeydown = 0;

function handleKeyup(event) {
    showCaretPos(event);
    const key = event.key;
    const that = event.target;
    const lineNo = parseInt(that.dataset.lineNumber);

    // get token under caret position
    let currentToken = null;
    const tokens = new Scanner(that.textContent,that.dataset.lineNumber).scanTokens();
    const caretPos = getCaretPosition();
    for (let token of tokens) {
        const tokenEnd = token.pos + token.lexeme.length;
        if (token.pos <= caretPos &&  caretPos <= tokenEnd) {
            currentToken = token;
            break;
        }
    }
    console.log('currentToken', currentToken)
    if (tooltipElem) {
        tooltipElem.remove();
        tooltipElem = null;
    }


    //no autocompletion if lines were changed between key presses
    if (lineNo != lineKeydown) {
        return;
    }
    // add matching parenthesis
    if (key == '(') {
        const closeCount = (that.textContent.match(/\)/g) || []).length;
        const openCount = (that.textContent.match(/\(/g)).length;
        // XXX 
        if (openCount != closeCount){
            document.execCommand('insertText',false, ')');
            SetCaretPosition(that,caretPos);
        }
    }

    let triggerAutocompletion = false;
    if (key.length == 1 && key != ' ') {
        triggerAutocompletion = true;
    } else if (!enterProcessed && key == 'Enter' || !tabProcessed && key == 'Tab') {
        triggerAutocompletion = true;
    } else if (key == 'Control' || key == 'Shift') {
        triggerAutocompletion = true;
    } else if (key == 'ArrowUp') {
        triggerAutocompletion = true;
        selectionIndex--;
    } else if (key == 'ArrowDown') {
        triggerAutocompletion = true;
        selectionIndex++;
    } else {
        triggerAutocompletion = false;
        selectionIndex = 0;
    }

    if (triggerAutocompletion && currentToken && currentToken.type != TokenType.EOF) {
        //search from beginnig of current token until caret position
        let searchString = currentToken.lexeme.substring(0,caretPos - currentToken.pos);
        if (searchString.length != 0){
            let results = suggest(searchString);
            if (results.size == 0)
                return;
            if (selectionIndex < 0) {
                selectionIndex = 0;
            } else if (selectionIndex >= results.size) {
                selectionIndex = results.size-1;
            }
            console.log('sel index', selectionIndex);

            let tooltipHtml = '<ul>';
            results = Array.from(results) 
            for (let i in results) {
                const description = results[i][1][1];
                if (selectionIndex == i)
                    tooltipHtml += `<li class='tooltipHighlight'>${description}`;
                else
                    tooltipHtml += `<li>${description}`;
            }
            tooltipHtml += '</ul>';
            tooltipElem = document.createElement('div');
            tooltipElem.className = 'tooltip';
            tooltipElem.innerHTML = tooltipHtml;
            document.body.append(tooltipElem);

            // position it below line
            const coords = that.getBoundingClientRect();
            const range = document.createRange();
            range.setStart(that.childNodes[0],currentToken.pos);
            currentTokenLeft = range.getBoundingClientRect().left;
            let left = currentTokenLeft - 10;
            if (left < 0) left = 0; // don't cross the left window edge

            let top = coords.top + that.offsetHeight;
            
            tooltipElem.style.left = left + 'px';
            tooltipElem.style.top = top + 'px';
            
            if ((key == 'Tab' || key == 'Enter')) {
                console.log('set');
                //XXX FIXME insert suggestion
                const suggestion = results[selectionIndex][0]; // logic symbol
                that.textContent = that.textContent.slice(0,currentToken.pos) +  suggestion + that.textContent.slice( currentToken.pos + searchString.length);
                tooltipElem.remove();
                tooltipElem = null;
                SetCaretPosition(that,currentToken.pos + suggestion.length);
            }
            if (key == 'Escape') {
                tooltipElem.remove();
                tooltipElem = null;
                currentToken = null;
            }
        }
    }
    // end autocompletion
}

function parseLineDiv(div) {
    const text = div.textContent.trim();

    if ( text != '' && div.dataset.lineNumber){
          console.log('check line')
          const parsedFormula = new Parser(new Scanner(text,div.dataset.lineNumber).scanTokens()).parse();
          if (parsedFormula) {
              console.log(parsedFormula)
              div.classList.add('lineOk'); //='#4CAF50 -9px 0px 0px 0px';
              div.classList.remove('lineError');
          } else {
              div.classList.add('lineError');
              div.classList.remove('lineOk');//='#E91E63 -9px 0px 0px 0px';

              console.log('no valid formula in line', div.dataset.lineNumber)
          }
    }
}

const indentAmount = '50';
function handleKeydown(event) {
    console.log('keydown')
    enterProcessed = false;
    tabProcessed = false;
    const that = event.target;
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    const lineNo = parseInt(that.dataset.lineNumber);
    lineKeydown = lineNo;
    const caretPos = getCaretPosition();
    switch (event.key) {
        case "d":
        //delete current line
          console.log('d',lineNo,event);
          if (lineNo > 0 && event.ctrlKey === true ) {
            console.log('delete line');
            const next = editor.removeLine(lineNo);
            if (next !== null)
                SetCaretPosition(next,editor.caretPos);
          } else {
            return;
          }
          break;
        case "ArrowLeft":
          console.log('left',lineNo);
          if (lineNo > 1 && caretPos === 0) {
            const next = document.getElementById('l'+(lineNo -1));
            editor.selectedLines = [next];
            SetCaretPosition(next,next.textContent.length);
          } else {
            return;
          }
          break;
        case "ArrowRight":
          console.log('right',lineNo);
          if (lineNo < editor.numberOfLines && caretPos === that.textContent.length) {
            const next = document.getElementById('l'+(lineNo +1));
            editor.selectedLines = [next];
            SetCaretPosition(next,0);
          } else {
            return;
          }
          break;
        case "ArrowDown":
            if (tooltipElem){
              break;
            }
          console.log('down',lineNo);
          if (lineNo < editor.numberOfLines) {
            const next = document.getElementById('l'+(lineNo + 1));
            editor.selectedLines = [next];
            parseLineDiv(that);
            SetCaretPosition(next,editor.caretPos);
          }
          break;
        case "ArrowUp":
          if (tooltipElem){
            break;
          }
          console.log('up', lineNo);
          if (lineNo > 1) {
            const next = document.getElementById('l'+(lineNo - 1));
            editor.selectedLines = [next];
            parseLineDiv(that);
            SetCaretPosition(next,editor.caretPos);
          }
          break;
        case "Enter":
          if (tooltipElem){
            break;
          }
          console.log('Enter');
          const next = editor.addNewLineAfter(lineNo);
          next.style.textIndent = (that.dataset.level * indentAmount) + 'px';
          next.dataset.level = that.dataset.level;
          //split content
          const textLeft = that.textContent.slice(caretPos);
          that.textContent = that.textContent.slice(0,caretPos);
          next.textContent = textLeft;
          editor.selectedLines = [next];
          SetCaretPosition(next,0);
          parseLineDiv(that);
          enterProcessed = true;
          break;
        case "Tab":
          if (tooltipElem){
            break;
          }

          console.log('Tab');
          let indentLevel = that.dataset.level;
          if (event.shiftKey == true){
            if (indentLevel > 0)
                that.style.textIndent = (--indentLevel * indentAmount) + 'px';
          } else {
                that.style.textIndent = (++indentLevel * indentAmount) + 'px';
          }
          that.dataset.level = indentLevel;
          tabProcessed = true;
          break;
        case "Backspace":
            {
                console.log('Backspace');
                const sel = window.getSelection();
                if (sel.type === "Caret") {
                    const range = sel.getRangeAt(0);
                    if (range.startOffset == 0) {
                        let indentLevel = that.dataset.level;
                        if (indentLevel > 0){
                            that.style.textIndent = (--indentLevel * indentAmount) + 'px';
                            that.dataset.level = indentLevel;
                        }
                    } else {
                        return;
                    }
                }
            }
          //break; intentionally Fall through to delete...
        case "Delete":
          console.log('Delete');
          {
            const sel = window.getSelection();
            if (sel.type === 'None')
                return;
            const range = sel.getRangeAt(0);
            if (sel.type === 'Range') {
                
                if (editor.selectedLines !== null && editor.selectedLines.length > 1) {
                    console.log(editor.selectedLines)
                    // only delete selection
                    range.deleteContents();
                    let removeLines = [];
                    editor.selectedLines.forEach(line => {
                        const lineNo = parseInt(line.dataset.lineNumber);
                        if (lineNo == 1)
                            return;
                        const lineAfterEdit = editor.getLineByNumber(lineNo);
                        if (lineAfterEdit !== null && lineAfterEdit.textContent.trim().length == 0) {
                            lineAfterEdit.remove();
                        }
                    });
                    editor.updateLineNumbers();
                    const startLine = editor.getLineByNumber(editor.selectedLines[0].dataset.lineNumber);
                    SetCaretPosition(startLine,range.startOffset);
                } else if(editor.selectedLines !== null && editor.selectedLines.length == 1){
                    range.deleteContents();
                    SetCaretPosition(editor.selectedLines[0],range.startOffset);
                } else {
                    return;
                }
            } else {
                // Delete whole line if line is empty
                if (that.textContent.length == 0 ){
                    const next = editor.removeLine(lineNo);
                    if (next !== null){
                        SetCaretPosition(next,editor.caretPos);
                        editor.selectedLines = [next];
                    }
                }
                else {
                    if (event.key == 'Backspace' && caretPos == 0 && lineNo > 0) {
                        const text = that.textContent;
                        editor.removeLine(lineNo);
                        const next = document.getElementById('l'+(lineNo - 1));
                        const cursorPos = next.textContent.length;
                        next.textContent += text;
                        editor.selectedLines = [next];
                        SetCaretPosition(next, cursorPos);
                        // event handled, don't delete any character on next line!
                        break;
                    }
                    // propagate event further up
                    return;
                }
            }
          }
          break;
        default:
            if (event.ctrlKey || event.shiftKey)
                return;
            
            const sel = window.getSelection();
            if (sel.type === 'None')
                return;
            const range = sel.getRangeAt(0);
            if (sel.type === 'Range') {
                // if a range was selected and any character was typed
                if(editor.selectedLines !== null && editor.selectedLines.length == 1){
                    range.deleteContents();
                    SetCaretPosition(editor.selectedLines[0],range.startOffset);
                } 
            }
          return; // Quit when this doesn't handle the key event.
    }

    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
}

function handlePaste(event) {
    console.log('paste')
    event.preventDefault()
    const lines = event.clipboardData.getData('text').split('\n');
    let that = event.target;
    if (that.nodeType == 3) {
        // Firefox target is of type text node
        that = that.parentNode;
    }
    const indentLevel =that.dataset.level;
    const startline = that.closest('.line').dataset.lineNumber;
    if (startline < 1)
        return
    if (lines.length == 0)
        return
    const text = lines[0];
    const sel = window.getSelection()
    const range = sel.getRangeAt(0)
    if (sel.type === 'Caret')
        document.execCommand("insertText", false, text);
    else if (sel.type === 'Range') {
        range.deleteContents();
        if (range.commonAncestorContainer.nodeType != 3){
            // we have a selection over multiple lines
            // append content on first line
            that.textContent += text;
        } else {
            range.insertNode(document.createTextNode(text));
        }
    }
    range.collapse()
    if (lines.length == 1) {
        that.contentEditable = 'true';
        that.focus();
        editor.selectedLines = [that]
        return
    }
    let lastLine = that;
    let currentLine = parseInt(that.dataset.lineNumber);
    for (let i=1; i<lines.length; i++){
       const newLine = editor.addNewLineAfter(currentLine++);
       newLine.textContent = lines[i];
       newLine.dataset.level = indentLevel;
       newLine.style.textIndent = (indentLevel * indentAmount ) + 'px';
       lastLine = newLine;
    }
    editor.selectedLines = [lastLine];
    SetCaretPosition(lastLine,lastLine.textContent.length);
}

window.addEventListener("load", function(){
    const ed = document.getElementById('editor');
    ed.addEventListener('keyup', handleKeyup);
    ed.addEventListener('paste', handlePaste);
    document.addEventListener("keydown", handleKeydown);
    //register on window to capture mouseups everywhere (i.e. if user selects fast or imprecisely)
    window.addEventListener("mousedown", handleMouse);
    window.addEventListener('mouseup', handleMouse);

});

    
    function setCursor() {
        const line = document.getElementById('l3');
        SetCaretPosition(line,3);
    }

    // Move caret to a specific point in a DOM element
    function SetCaretPosition(el, pos){
        //console.log('caret', pos, el)
        if (el === null)
            return -1;
        el.contentEditable = 'true';
        if(activeLine !== null && activeLine != el){
                activeLine.contentEditable = 'false';
        }
        activeLine = el;

        if (el.childNodes.length == 0) {
            el.appendChild(document.createTextNode(''));           
        }
        //XXX FIXME
        // Loop through all child nodes
        for(let node of el.childNodes){
            if(node.nodeType == 3){ // we have a text node
                pos = Math.min(node.length,pos);
                // finally add our range
                let range = document.createRange(),
                    sel = window.getSelection();
                range.setStart(node,pos);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return -1; // we are done
                
            }
            // if(node.nodeType == 3){ // we have a text node
            //     if(node.length >= pos){
            //         // finally add our range
            //         let range = document.createRange(),
            //             sel = window.getSelection();
            //         range.setStart(node,pos);
            //         range.collapse(true);
            //         sel.removeAllRanges();
            //         sel.addRange(range);
            //         return -1; // we are done
            //     }else{
            //         pos -= node.length;
            //     }
            // } else {
            //     pos = SetCaretPosition(node,pos);
            //     if(pos == -1){
            //         return -1; // no need to finish the for loop
            //     }
            // }
        }
        return pos; // needed because of recursion stuff
    }

    //underlines the selected text
    function underline()
    {
        document.execCommand("underline", false, null);
    }
   
    //makes the selected text as hyperlink.
    function link()
    {
        let url = prompt("Enter the URL");
        document.execCommand("createLink", false, url);
    }
   
    //displays HTML of the output
    function displayhtml()
    {
        //set textContent of pre tag to the innerHTML of editable div. textContent can take any form of text and display it as it is without browser interpreting it. It also preserves white space and new line characters.
        document.getElementsByClassName("htmloutput")[0].textContent = document.getElementsByClassName("editor")[0].innerHTML;
    }
