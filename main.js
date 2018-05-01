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

function showCaretPos() {
  let el = this;
  let caretPosEl = document.getElementById("caretPos");
  caretPosEl.innerHTML = "Caret position in line: " + this.id + " at index: " + getCaretPosition(); //getCaretCharacterOffsetWithin(el);
}

//document.body.onkeyup = showCaretPos;
//document.body.onmouseup = showCaretPos;

    window.addEventListener("load", function(){
        let ttt = document.getElementsByClassName('editor');
        for (let i=0;i<ttt.length;i++){
            ttt[i].addEventListener('keyup', showCaretPos, false);
            ttt[i].addEventListener('mouseup', showCaretPos, false);
            ttt[i].addEventListener("keydown", function (event) {
              if (event.defaultPrevented) {
                return; // Do nothing if the event was already processed
              }
              let lineNo = parseInt(this.id[1]);
              switch (event.key) {
                case "ArrowDown":
                  console.log('down',lineNo);
                  if (lineNo > 0 && lineNo < 3) {
                    let next = document.getElementById('l'+(lineNo + 1));
                    SetCaretPosition(next,3);
                  }
                  break;
                case "ArrowUp":
                  console.log('up');
                  if (lineNo > 1 && lineNo < 4) {
                    let next = document.getElementById('l'+(lineNo - 1));
                    SetCaretPosition(next,3);
                  }
                  break;
                default:
                  return; // Quit when this doesn't handle the key event.
              }

              // Cancel the default action to avoid it being handled twice
              event.preventDefault();
            }, true);
        }

        document.execCommand('styleWithCSS', false, true);
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
                if(node.length >= pos){
                    // finally add our range
                    let range = document.createRange(),
                        sel = window.getSelection();
                    range.setStart(node,pos);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return -1; // we are done
                }else{
                    pos -= node.length;
                }
            }else{
                pos = SetCaretPosition(node,pos);
                if(pos == -1){
                    return -1; // no need to finish the for loop
                }
            }
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
