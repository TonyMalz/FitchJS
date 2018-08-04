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

//XXX FIXME
let lastLineNo  = 3;
let caretPos = 0;

function showCaretPos(event) {
  let el = event.target;
  let caretPosEl = document.getElementById("caretPos");
  caretPos = getCaretPosition();
  caretPosEl.innerHTML = "Caret position in line: " + el.dataset.lineNumber + " at index: " + caretPos; //getCaretCharacterOffsetWithin(el);
}


let mousedown = null;
let activeLine = null;
function handleMouse(event) {

    console.log(event)
    const that = event.target;
    switch (event.type) {
        case 'mousedown':
            mousedown = event;
            if(activeLine !== null){
                activeLine.contentEditable = 'false';
            }
            break;
        case 'mouseup':
            if (mousedown !== null && Math.abs(mousedown.clientX - event.clientX) < 3){
                that.contentEditable = 'true';
                that.focus();
                activeLine = that;
            }
            const sel = window.getSelection()
            if (sel.type === 'Range') {
                const range = sel.getRangeAt(0)
                const fragments = range.cloneContents()
                const nodeList= fragments.querySelectorAll('.line')
                console.log(nodeList)
            }
            
            break;
    }
    
    //event.preventDefault();
}


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
          const next = editor.addNewLineAfter(lineNo);
          SetCaretPosition(next,caretPos);
          break;
        case "Delete":
          console.log('Delete');
          {
            const sel = window.getSelection();
            const range = sel.getRangeAt(0);
            if (sel.type === 'Range') {
                // only delete selection
                range.deleteContents();
                // XXX check empty lines and line numbers past deleted lines

            } else {
                // Delete whole line if line is empty
                if (that.innerText.length === 0 ){
                    const next = editor.removeLine(lineNo);
                    if (next !== null)
                        SetCaretPosition(next,caretPos);
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
    const lines = event.clipboardData.getData('text').split('\n')
    let startline = event.target.dataset.lineNumber;
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
    that = event.target
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
       lastLine = newLine;
    }
    SetCaretPosition(lastLine,lastLine.innerText.length);
}

window.addEventListener("load", function(){
    const ed = document.getElementById('editor');
    ed.addEventListener('keyup', showCaretPos, true);
    ed.addEventListener('paste', handlePaste, true);
    document.addEventListener("keydown", handleKeydown , true);
    //register on window to capture mouseups everywhere (i.e. if user selects fast or imprecisely)
    window.addEventListener("mousedown", handleMouse , false);
    window.addEventListener('mouseup', handleMouse, false);

}, false);

    
    function setCursor() {
        const line = document.getElementById('l3');
        SetCaretPosition(line,3);
    }

    // Move caret to a specific point in a DOM element
    function SetCaretPosition(el, pos){
        el.contentEditable = 'true';
        if(activeLine !== null){
                activeLine.contentEditable = 'false';
        }
        activeLine = el;
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
