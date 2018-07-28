/*
style="-webkit-user-select:text;" is needed for iPad

*/
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

//document.body.onkeyup = showCaretPos;
//document.body.onmouseup = showCaretPos;
function handleKeydown(event) {
    const that = event.target;
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    let lineNo = parseInt(that.dataset.lineNumber);
    switch (event.key) {
        case "ArrowDown":
          console.log('down',lineNo);
          if (lineNo < lastLineNo) {
            let next = document.getElementById('l'+(lineNo + 1));
            SetCaretPosition(next,caretPos);
          }
          break;
        case "ArrowUp":
          console.log('up');
          if (lineNo > 1) {
            let next = document.getElementById('l'+(lineNo - 1));
            SetCaretPosition(next,caretPos);
          }
          break;
        case "Enter":
          console.log('Enter');
          let line = `<div data-line-number=${lineNo+1} id="l${lineNo+1}" class="editor" contenteditable="true" spellcheck="false">Line ${lineNo+1}</div>`
          that.insertAdjacentHTML('afterend',line);
          let next = document.getElementById('l'+(lineNo + 1));
          lastLineNo = Math.max(lastLineNo, (lineNo + 1));
          SetCaretPosition(next,6);
          break;
        default:
          return; // Quit when this doesn't handle the key event.
    }

    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
}


    window.addEventListener("load", function(){
        // let lines = document.getElementsByClassName('editor');
        // for (let i=0;i<lines.length;i++){
        //     lines[i].addEventListener('keyup', showCaretPos, false);
        //     lines[i].addEventListener('mouseup', showCaretPos, false);
        //     lines[i].addEventListener("keydown", handleKeydown , true);
        // }
        const editor = document.getElementById('editor');
        editor.addEventListener("keydown", handleKeydown , true);
        editor.addEventListener('keyup', showCaretPos, false);
        editor.addEventListener('mouseup', showCaretPos, false);
        //document.execCommand('styleWithCSS', false, true);
    }, false);
    
    function setCursor() {
        const line = document.getElementById('l3');
        SetCaretPosition(line,3);
    }

    // Move caret to a specific point in a DOM element
    function SetCaretPosition(el, pos){
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
