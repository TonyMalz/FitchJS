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
  caretPosEl.innerHTML = "Caret position in line: " + line + " at index: " + editor.caretPos; //getCaretCharacterOffsetWithin(el);
}


let mousedown = null;
let activeLine = null;
function handleMouse(event) {
    console.log(event)
    const that = event.target;
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
                if (that.className === 'line' || that.parentNode.className === 'line'){
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

// XXX FIXME: use tokenizer!!
let suggestions = ['Hans','Hallo','Peter','leo','affe','MIESEL','Lola','wassertier(a)'];
suggestions.sort( (a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));
function suggest(search) {
    // escape brackets
    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // enclose search term in brackets
    const regex = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
    console.log(search,regex)

    let results = [];
    suggestions.filter( term => {
        if (regex.test(term))
            results.push(term.replace(regex,'<b>$1</b>'))
    });
    console.log(results)
    return results;
}

let currentToken = null;
let currentTokenLeft = 0;
let tooltipElem;
function handleKeyup(event) {
    showCaretPos(event);
    const key = event.key;
    console.log('keyup', key.length, key)
    const that = event.target;
    if (tooltipElem) {
        tooltipElem.remove();
        tooltipElem = null;
    }

    if (key.length == 1){
        // single alphabetic character starts search token sequence
        if (currentToken == null && key.toLowerCase() >= 'a' && key.toLowerCase() <= 'z' ) {
            currentToken = key;
            currentTokenLeft = window.getSelection().getRangeAt(0).getBoundingClientRect().left
        } else if (currentToken !== null) {
            if (key != ' ')
                currentToken += key;
            else {
                currentToken = null;
                currentTokenLeft = 0;
            }
        }
    } else if (key !== 'Shift' && key !== 'Control' && key !== 'Tab' && key !== 'Alt') {
        //reset token
        currentToken = null;
        currentTokenLeft = 0;
    }

    console.log('Token:', currentToken)
    if (currentToken !== null) {
        let results = suggest(currentToken);
        if (results.length == 0)
            return;
        let tooltipHtml = results.join('<br/>')
        tooltipElem = document.createElement('div');
        tooltipElem.className = 'tooltip';
        tooltipElem.innerHTML = tooltipHtml;
        document.body.append(tooltipElem);

        // position it below line
        let coords = that.getBoundingClientRect();
        let left = currentTokenLeft - 20;
        if (left < 0) left = 0; // don't cross the left window edge

        let top = coords.top + that.offsetHeight;
  
        tooltipElem.style.left = left + 'px';
        tooltipElem.style.top = top + 'px';
    }

}
// XXX


const indentAmount = '50';
function handleKeydown(event) {
    const that = event.target;
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    const lineNo = parseInt(that.dataset.lineNumber);
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
        case "ArrowDown":
          console.log('down',lineNo);
          if (lineNo < editor.numberOfLines) {
            const next = document.getElementById('l'+(lineNo + 1));
            editor.selectedLines = [next];
            SetCaretPosition(next,editor.caretPos);
          }
          break;
        case "ArrowUp":
          console.log('up');
          if (lineNo > 1) {
            const next = document.getElementById('l'+(lineNo - 1));
            editor.selectedLines = [next];
            SetCaretPosition(next,editor.caretPos);
          }
          break;
        case "Enter":
          console.log('Enter');
          const next = editor.addNewLineAfter(lineNo);
          next.style.textIndent = (that.dataset.level * indentAmount) + 'px';
          next.dataset.level = that.dataset.level;
          editor.selectedLines = [next];
          SetCaretPosition(next,editor.caretPos);
          break;
        case "Tab":
          console.log('Tab');
          let indentLevel = that.dataset.level;
          if (event.shiftKey == true){
            if (indentLevel > 0)
                that.style.textIndent = (--indentLevel * indentAmount) + 'px';
          } else {
                that.style.textIndent = (++indentLevel * indentAmount) + 'px';
          }
          that.dataset.level = indentLevel;
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
                return
            }
          break;
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
                        if (lineAfterEdit !== null && lineAfterEdit.innerText.trim().length == 0) {
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
                if (that.innerText.length == 0 ){
                    const next = editor.removeLine(lineNo);
                    if (next !== null)
                        SetCaretPosition(next,editor.caretPos);
                }
                else {
                    // propagate event further up
                    return;
                }
            }
          }
          break;
        default:
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
        range.insertNode(document.createTextNode(text));
    else if (sel.type === 'Range') {
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
    }
    range.collapse()
    if (lines.length == 1) {
        that.contentEditable = 'true';
        that.focus();
        return
    }
    let lastLine = that;
    let currentLine = parseInt(that.dataset.lineNumber);
    for (let i=1; i<lines.length; i++){
       const newLine = editor.addNewLineAfter(currentLine++);
       newLine.innerText = lines[i];
       newLine.dataset.level = indentLevel;
       newLine.style.textIndent = (indentLevel * indentAmount ) + 'px';
       lastLine = newLine;
    }
    editor.selectedLines = [lastLine];
    SetCaretPosition(lastLine,lastLine.innerText.length);
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
