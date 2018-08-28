let tooltipToken = null;
let tooltipTokenValue = null;
function createToolTipToken(that,line) {
    if (!(line instanceof Line) ) return;
    const lineNumber = line.lineNumber;
    const operator = that.textContent.trim();
    const formula = line.formula;

    let htmlIntro = `<li> ${operator} <button data-line-number=${lineNumber} class='intro'>Intro</button> </li>`;
    let htmlElim = `<li> ${operator} <button data-line-number=${lineNumber} class='elim'>Elim</button> </li>`;
    
    if (formula instanceof FormulaNot) {
        if (!(formula.right instanceof FormulaNot)) {
            htmlElim = '';
        }
    }

    if (formula instanceof FormulaOr) {
        htmlIntro = '';
        htmlElim = `<li> ${operator} <button data-line-number=${lineNumber} class='elim'>Elim</button>
                        <input type='text' class='tooltipTokenValue'></input>
                    </li>`;

    }

    if (line.isPremise || line.getDom().classList.contains('fitchline')){
        htmlIntro = '';
    }

    const html = `
                <ul>
                    ${htmlIntro}
                    ${htmlElim}
                </ul>
                `;
    tooltipToken = document.createElement('div');
    tooltipToken.className = 'tooltipToken';
    tooltipToken.innerHTML = html;
    document.body.append(tooltipToken);

    // position it below token
    const coords = that.getBoundingClientRect();
    let left = coords.left - 25;
    if (left < 0) left = 0; // don't cross the left window edge
    let top = coords.top + that.offsetHeight;
    tooltipToken.style.left = left + 'px';
    tooltipToken.style.top = top + 'px';
}

let mousedown = null;
function handleMouse(event) {
    console.log(event)
    let that = event.target;
    if (that.classList.contains('tooltipTokenValue')){
        return;
    }
    if (that.nodeName == 'SPAN'){
        console.log('span clicked')
        if (tooltipToken) {
            tooltipToken.remove();
            tooltipToken = null;
        }
        if (that.classList.contains('mainOp') && (
            that.classList.contains('tokenAnd') || 
            that.classList.contains('tokenImpl') ||
            that.classList.contains('tokenOr') ||
            that.classList.contains('tokenNot')
            )){
            const lineNo = parseInt(that.closest('.line').dataset.lineNumber);
            createToolTipToken(that,editor.getLine(lineNo));
            return;
        }
        that = event.target.parentNode;
    }


    if (tooltipElem) {
        tooltipElem.remove();
        tooltipElem = null;
    }
    
    switch (event.type) {
        case 'mousedown':
            if (that.classList.contains('rule')) {
                //if rule was already selected, start after current rule name
                if (that.textContent.length > 0){
                    const indexColon = that.textContent.indexOf(':');
                    if (indexColon >= 0){
                        event.preventDefault();
                        SetCaretPosition(that,indexColon+1);
                        ruleSelected = true;
                    }
                } else {
                    ruleSelected = false;
                }
                break;
            }
            editor.selectedLines = null;
            mousedown = event;
            if(editor.activeLine !== null){
                editor.activeLine.contentEditable = 'false';
            }
            break;
        case 'mouseup':
            if (tooltipToken) {
                tooltipToken.remove();
                tooltipToken = null;

                // Tactics
                if (event.target.classList.contains('intro')){
                    // INTRO Rules
                    let lineNo = parseInt(event.target.dataset.lineNumber);
                    const line = editor.getLine(lineNo);
                    if (line.isPremise || line.getDom().classList.contains('fitchline')) {
                        // don't allow intro for premises and asumptions
                        return;
                    }
                    const formula = line.formula;

                    if (formula instanceof FormulaAnd) {
                        console.log('Insert AND INTRO', formula);
                        for (const term of formula.terms){
                            editor.addLine(String(term),lineNo++,false,line.level);
                        }
                    }

                    if (formula instanceof FormulaImpl) {
                        console.log('Insert IMPL INTRO', formula);
                        editor.addLine(String(formula.left),lineNo++,false,(line.level+1));
                        editor.addLine('',lineNo++,false,(line.level+1));
                        editor.addLine(String(formula.right),lineNo++,false,(line.level+1));
                    }

                    if (formula instanceof FormulaNot) {
                        console.log('Insert NOT INTRO', formula);
                        editor.addLine(String(formula.right),lineNo++,false,(line.level+1));
                        editor.addLine('',lineNo++,false,(line.level+1));
                        editor.addLine('⊥',lineNo++,false,(line.level+1));
                    }

                    
                }
                if (event.target.classList.contains('elim')){
                    let lineNo = parseInt(event.target.dataset.lineNumber);
                    const line = editor.getLine(lineNo);
                    const formula = line.formula;
                    
                    if (formula instanceof FormulaAnd) {
                        console.log('Insert AND ELIM', formula);
                        for (const term of formula.terms){
                            editor.addLine(String(term),++lineNo,false,line.level);
                        }
                    }

                    if (formula instanceof FormulaImpl) {
                        console.log('Insert IMPL ELIM', formula);
                        let levelAnte = line.level;
                        if (line.getDom().classList.contains('fitchline')) {
                            levelAnte--;
                        }
                        editor.addLine(String(formula.left),lineNo++,false,levelAnte);
                        editor.addLine(String(formula.right),++lineNo,false,line.level);
                    }

                    if (formula instanceof FormulaNot && formula.right instanceof FormulaNot) {
                        console.log('Insert NOT ELIM', formula);
                        editor.addLine(String(formula.right.right),++lineNo,false,(line.level));
                    }

                    if (formula instanceof FormulaOr) {
                        console.log('Insert OR ELIM', formula);
                        for (const term of formula.terms){
                            editor.addLine(String(term),++lineNo,false,(line.level+1));
                            editor.addLine('',++lineNo,false,(line.level+1));
                            editor.addLine(tooltipTokenValue,++lineNo,false,(line.level+1));
                            editor.addLine('',++lineNo,false,(line.level));
                        }
                        editor.addLine(tooltipTokenValue,lineNo,false,(line.level));
                    }
                }

                editor.setSyntaxHighlighting(true);
                editor.checkFitchLines();
            }
            if (that.classList.contains('rule'))
                return;
            if (mousedown !== null && Math.abs(mousedown.clientX - event.clientX) < 3){
                // only update if a line was selected
                if (that.classList.contains('line') || that.parentNode.classList.contains('line')){
                    
                    const sel = window.getSelection();
                    if (sel && sel.type == "Range"){
                        console.log('double click select');
                        const range = getHtmlRangePos(that);
                        console.log('selcted range:', range);
                        const lineNo = parseInt(that.dataset.lineNumber);
                        const line = editor.getLine(lineNo);
                        line.setSyntaxHighlighting(false);
                        SetRangePosition(line.getDom(),range[0],range[1]);
                        editor.selectedLines=[line.getDom()];
                        return;
                    }
                    that.contentEditable = 'true';
                    const lineNo = parseInt(that.dataset.lineNumber);
                    const line = editor.getLine(lineNo);
                    const caretPos = getHtmlCaretPos(that)
                    
                    line.setSyntaxHighlighting(false);
                    SetCaretPosition(that,caretPos);
                    console.log(editor.selectedLines)
                    showCaretPos(event);
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

const suggestTokens = new Map();
suggestTokens.set("∧ And", '∧');
suggestTokens.set("v Or", '∨');
suggestTokens.set("¬ Not", '¬');
suggestTokens.set("∀ For All", '∀');
suggestTokens.set("-> Implication", '→');
suggestTokens.set("<-> Bi-Implication", '↔');
suggestTokens.set("∃ Exists", '∃');
suggestTokens.set("⊥ Bottom", '⊥');

const suggestrules = new Map();
suggestrules.set("∧ And Intro", '∧ Intro:');
suggestrules.set("∧ And Elim", '∧ Elim:');
suggestrules.set("v Or Intro", '∨ Intro:');
suggestrules.set("v Or Elim", '∨ Elim:');
suggestrules.set("¬ Not Intro", '¬ Intro:');
suggestrules.set("¬ Negation Intro", '¬ Intro:');
suggestrules.set("¬ Not Elim", '¬ Elim:');
suggestrules.set("¬ Negation Elim", '¬ Elim:');
suggestrules.set("∀ For All Intro", '∀ Intro:');
suggestrules.set("∀ Universal Intro", '∀ Intro:');
suggestrules.set("∀ For All Elim", '∀ Elim:');
suggestrules.set("∀ Universal Elim", '∀ Elim:');
suggestrules.set("-> Implication Intro", '→ Intro:');
suggestrules.set("-> Implication Elim", '→ Elim:');
suggestrules.set("<-> Bi-Implication Intro", '↔ Intro:');
suggestrules.set("<-> Bi-Implication Elim", '↔ Elim:');
suggestrules.set("∃ Existential Intro", '∃ Intro:');
suggestrules.set("∃ Existential Elim", '∃ Elim:');
suggestrules.set("⊥ Bottom Intro", '⊥ Intro:');
suggestrules.set("⊥ Bottom Elim", '⊥ Elim:');
suggestrules.set("= Identity Intro", '= Intro:');
suggestrules.set("= Identity Elim", '= Elim:');
suggestrules.set("Reiteration", 'Reit:');
function suggest(search) {
     // escape brackets
    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // enclose search term in brackets
    const regex = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
    console.log(search,regex)

    const results = new Map();
    for (const identifier of editor.enteredIdentifiers){
        // add alreade entered terms
        suggestTokens.set(identifier,identifier);
    }
    for (const [matchstring,token] of suggestTokens){
        if (regex.test(matchstring))
            results.set(token,[matchstring,matchstring.replace(regex,'<b>$1</b>')]);
    }
    console.log('match results:', results)

    return results;
}
function suggestRules(search) {
     // escape brackets
    search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    search = search.trimStart();
    search = search.replace(/\s+/,' ')
    // enclose search term in brackets
    const regex = new RegExp("(" + search + ")", "gi");
    console.log(search,regex)

    const results = new Map();
    for (const [matchstring,token] of suggestrules){
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

function handleKeydownRule(event){
    console.log('rule keydown')
    const that = event.target;
    const caretPos = getCaretPosition();
    const key = event.key;
    const lineNo = parseInt(that.dataset.lineNumber);
    switch (key) {
        case ":":
        case "Enter":
            if (tooltipElem){
                break;
            }
            if (lineNo == editor.numberOfLines){
                // add new line if rule is in last line
                const next = editor.addEmptyLineAfter(lineNo);
                SetCaretPosition(next,0);
            } else {
                const next = editor.getLine(lineNo+1);
                SetCaretPosition(next,0);
            }
            
            enterProcessed = true;
            break;
        case "ArrowDown":
            if (tooltipElem){
              break;
            }
            if (lineNo < editor.numberOfLines) {
                const next = editor.getLine(lineNo + 1);
                SetCaretPosition(next,editor.caretPos);
            }
            break;
        case "ArrowUp":
            if (tooltipElem){
                break;
            }
            if (lineNo > 1) {
                const next = editor.getLine(lineNo - 1);
                SetCaretPosition(next,editor.caretPos);
            }
            break;
        case "ArrowLeft":
            if (that.textContent[caretPos-1] == ':'){
                //do not allow past colon
            } else if (that.textContent.trim() == '') {
                // go back to end of line
                const line = editor.getLine(lineNo);
                SetCaretPosition(line,line.content.length);
            } else {
                return
            }
            break;
        case "Backspace":
            console.log('Backspace')
            if (that.textContent[caretPos-1] == ':'){
                //delete whole line if rule will be deleted
                that.textContent = '';
                ruleSelected = false;
            } else if (that.textContent.trim() == '') {
                // go back to end of line
                const line = editor.getLine(lineNo);
                line.setContent(line.content);//strip HTML
                SetCaretPosition(line,line.content.length);
            } else {
                return;
            }
            break
        case "Tab":
            if(tooltipElem){
                break;
            }
            if(event.shiftKey){
                 // go back to end of line
                console.log('go back to end of line')
                const line = editor.getLine(lineNo);
                SetCaretPosition(line,line.content.length);
            }
            break;
        case "r":
              if (event.ctrlKey === true ) {
                    console.log('jump back to line');
                    if(that.previousElementSibling) {
                        that.previousElementSibling.focus();
                    }
                break;
              }
            return;
        default:
            if (ruleSelected) {
                //only allow line numbers and comma and minus after rule was selected
                if(key >= '0' && key <='9' || key == ',' || key == '-' || key == 'ArrowRight' || key == 'Delete' )
                    return
                break
            }
            return;
    }
    event.preventDefault();
}
//XXX FIXME on per line basis
let ruleSelected = false;
function handleKeyupRule(event) {
    const key = event.key;
    const that = event.target;
    const lineNo = parseInt(that.dataset.lineNumber);

    // get token under caret position
    let currentToken = null;
    const caretPos = getCaretPosition();
    const tokens = new Scanner(that.textContent, that.dataset.lineNumber).scanTokens();
    
    const ruleLineNumbers = new Set();
    for (let i=0; i<tokens.length; i++) {
        if (tokens[i].type == TokenType.NUMBER){
            ruleLineNumbers.add(tokens[i].literal);
            // check for number range
            if(tokens[i+1].type == TokenType.MINUS && tokens[i+2].type == TokenType.NUMBER) {
                const end = tokens[i+2].literal;
                if (end > 100)
                    continue;
                for(let start = (tokens[i].literal+1); start <= end; start++){
                    ruleLineNumbers.add(start);
                }
                i+=2;
            }
        }
    }
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


    let triggerAutocompletion = false;
    if (key.length == 1 ) {
        triggerAutocompletion = true;
    } else if (key == 'Enter' || key == 'Tab') {
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

    if (ruleSelected){
        triggerAutocompletion = false;
        document.querySelectorAll('.line').forEach(line => {
            line.classList.remove('selectedLine');
        });
        console.log(ruleLineNumbers)
        let lines = [];
        for (let number of ruleLineNumbers) {
            const line = editor.getLineByNumber(number);
            if (line) {
                line.classList.add('selectedLine');
                lines.push(new Parser(new Scanner(line.textContent,number).scanTokens()).parse());
            }
        }

        const indexColon = that.textContent.indexOf(':');
        const rule = that.textContent.substring(0,indexColon);
        switch (rule) {
            case "∧ Intro": {
                    console.log('AND Intro selected');
                    const rule = new RuleAndIntro(...lines);
                    const currentLine = parseLineDiv(editor.getLineByNumber(lineNo));
                    if (currentLine) {
                        highlightFormulaParts(lineNo,TokenType.AND,...lines);
                        currentLine.setRule(rule);
                        if (currentLine.check()) {
                            that.classList.add('ruleOk');
                            that.classList.remove('ruleError');
                        } else {
                            const error = currentLine.rule.getError();
                            console.log(error)
                            that.classList.remove('ruleOk');
                            that.classList.add('ruleError');

                        }
                    }
                }
            break;
            case "Reit": {
                    console.log('Reit selected');
                    const rule = new RuleReiteration(lines[0]);
                    const currentLine = parseLineDiv(editor.getLineByNumber(lineNo));
                    if (currentLine) {
                        currentLine.setRule(rule);
                        if (currentLine.check()) {
                            that.classList.add('ruleOk');
                        } else {
                            that.classList.remove('ruleOk');
                        }
                    }
                }
            break;
        }
    }

    if (triggerAutocompletion) {
        //search from beginnig of current token until caret position
        // let searchString = currentToken.lexeme.substring(0,caretPos - currentToken.pos);
        let searchString = that.textContent;
        console.log('search', searchString)
        if (searchString.length != 0){
            let results = suggestRules(searchString);
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
                    tooltipHtml += `<li data-value='${results[i][0]}' class='tooltipHighlight'>${description}`;
                else
                    tooltipHtml += `<li>${description}`;
            }
            tooltipHtml += '</ul>';
            tooltipElem = document.createElement('div');
            tooltipElem.className = 'tooltipRule';
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
                // rule was selected
                const suggestion = results[selectionIndex][0];
                that.textContent = suggestion;
                tooltipElem.remove();
                tooltipElem = null;
                selectionIndex = 0;
                ruleSelected = true;
                highlightFormulaParts(lineNo,TokenType.AND);
                SetCaretPosition(that,currentToken.pos + suggestion.length);
            }
            if (key == 'Escape') {
                tooltipElem.remove();
                tooltipElem = null;
                currentToken = null;
            }
        }
    }
}

function handleKeyup(event) {
    editor.caretPos = getCaretPosition();
    caretPos = editor.caretPos;
    const key = event.key;
    const that = event.target;
    if (that.classList.contains('rule')) {
        handleKeyupRule(event);
        return;
    }
    if (that.classList.contains('tooltipTokenValue')){
        tooltipTokenValue = that.value;
        console.log(tooltipTokenValue)
        return;
    }
    if (!that.classList.contains('line')){
        return;
    }

    showCaretPos(event);
    const lineNo = parseInt(that.dataset.lineNumber);

    // get token under caret position
    let currentToken = null;
    const tokens = new Scanner(that.textContent, that.dataset.lineNumber).scanTokens();
    
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
    if (key == '(' && (that.textContent.length == caretPos || that.textContent[caretPos] == ' ')) {
        console.log('parens:',currentToken,caretPos)
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
            if (results.size == 0){
                if (searchString[0].toLowerCase() == searchString[0]){
                    //if search string is a variable try anew
                    // XXX FIXME
                    searchString = searchString.substring(1);
                    currentToken.pos++;
                    results = suggest(searchString);
                }
                if (results.size == 0)
                    return;
            }
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
                console.log('insert suggestion');
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

const indentAmount = '50';
function handleKeydown(event) {
    console.log('keydown')
    enterProcessed = false;
    tabProcessed = false;
    const that = event.target;
    if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
    }
    if (that.classList.contains('tooltipTokenValue')){
        return;
    }
    const lineNo = parseInt(that.dataset.lineNumber);
    lineKeydown = lineNo;
    if (that.classList.contains('rule')) {
        handleKeydownRule(event);
        return;
    }
    const caretPos = editor.caretPos;
    switch (event.key) {
        case "ArrowLeft":
          console.log('left',lineNo);
          if (lineNo > 1 && caretPos === 0) {
            const next = editor.getLine(lineNo-1);
            SetCaretPosition(next,next.content.length);
          } else {
            return;
          }
          break;
        case "ArrowRight":
          console.log('right',lineNo);
          if (lineNo < editor.numberOfLines && caretPos === that.textContent.length) {
            const next = editor.getLine(lineNo+1);
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
            const next = editor.getLine(lineNo+1);
            SetCaretPosition(next,editor.caretPos);
          } else {
            //add new line if in last line
            const next = editor.addEmptyLineAfter(lineNo);
            SetCaretPosition(next,0);
          }
          break;
        case "ArrowUp":
          if (tooltipElem){
            break;
          }
          console.log('up', lineNo);
          if (lineNo > 1) {
            const next = editor.getLine(lineNo-1);
            SetCaretPosition(next,editor.caretPos);
          }
          break;
        case "Enter":
          if (tooltipElem){
            break;
          }
          console.log('Enter');
          const next = editor.addEmptyLineAfter(lineNo);
          
          //split content at cursor position
          const textLeft  = that.textContent.slice(0,caretPos);
          const textRight = that.textContent.slice(caretPos);
          const current = editor.getLine(lineNo);
          current.setContent(textLeft);
          next.setContent(textRight);
          SetCaretPosition(next,0);
          enterProcessed = true;
          break;
        case "Tab":
          if (tooltipElem){
            break;
          }

          console.log('Tab');
          //rule selection
          if(that.textContent.trim().length > 0 && caretPos == that.textContent.length){
            console.log('jump to rule selection')
            if(that.nextElementSibling) {
                that.nextElementSibling.focus();
            }
            tabProcessed = true;
            break;
          }
          const line = editor.getLine(lineNo);
          let indentLevel = line.level;
          if (event.shiftKey == true){
            if (indentLevel > 0)
                //close subproof
                line.setLevel(--indentLevel);
          } else {
                // check level of previous line
                const levelPrevLine = (lineNo > 1) ? editor.getLineByNumber(lineNo-1).dataset.level : 0;
                if (levelPrevLine < indentLevel) {
                    //do nothing since only one subproof level is allowed
                    tabProcessed = true;
                    break;
                }
                //open subproof
                line.setLevel(++indentLevel);
          }
          tabProcessed = true;
          break;
        case "Backspace":
            {
                console.log('Backspace');
                const sel = window.getSelection();
                if (sel.type === "Caret") {
                    const range = sel.getRangeAt(0);
                    if (range.startOffset == 0) {
                        const line = editor.getLine(lineNo);
                        let indentLevel = line.level;
                        // close subproof
                        if (indentLevel > 0){
                            line.setLevel(--indentLevel);
                            return;
                        } else {
                           if (lineNo > 0) {
                                const text = that.textContent;
                                editor.removeLine(lineNo);
                                const next = editor.getLine(lineNo - 1);
                                const cursorPos = next.content.length;
                                next.setContent(next.content + text);
                                SetCaretPosition(next, cursorPos);
                                // event handled, don't delete any character on next line!
                                break;
                            }
                        }
                    } else {
                        // if cursor was not at the beginnig of the current line
                        return;
                    }
                }
            }
          //break; intentionally Fall through to delete for user selections...
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
                    const startLine = editor.getLine(editor.selectedLines[0].dataset.lineNumber);
                    const caretPos = getHtmlCaretPos(startLine.getDom());
                    range.deleteContents();
                    const firstLineId = editor.selectedLines[0].id;
                    const firstLineAfterDeletion = document.getElementById(firstLineId);
                    const lastLineId = editor.selectedLines[editor.selectedLines.length-1].id;
                    const lastLineAfterDeletion = document.getElementById(lastLineId);
                    if (!firstLineAfterDeletion.nextElementSibling && editor.selectedLines[0].nextElementSibling){
                        // if rule selection is missing, add it again
                        firstLineAfterDeletion.parentNode.append(editor.selectedLines[0].nextElementSibling);
                    }

                    let removedLines = [];

                    //delete selected lines in descending order
                    const numLines = editor.selectedLines.length;
                    for (let i=numLines-1; i>=0; i--) {
                        const line = editor.selectedLines[i];
                        const lineNo = parseInt(line.dataset.lineNumber);
                        const lineAfterEdit = editor.getLineByNumber(lineNo);
                        if (!lineAfterEdit || lineAfterEdit.textContent.trim().length == 0) {
                            editor.removeLine(lineNo)
                            removedLines.push(lineNo);
                        }

                    }
                    const lastLineNo = parseInt(editor.selectedLines[editor.selectedLines.length-1].dataset.lineNumber);
                    if (removedLines.length == editor.selectedLines.length){
                        if (editor.lines.length == 2) {
                            //XXX FIXME if every line was deleted at last step to DOM;
                            editor.addLine(editor.lines[1].content);
                            editor.removeLine(2);
                        }
                        //all selected lines have been removed
                        //focus next line after last selected line
                        let nextLineNo = lastLineNo + 1;
                        if (nextLineNo > editor.numberOfLines){
                            //select line before first selected line
                            nextLineNo = startLine.lineNumber - 1;
                            if (nextLineNo < 1)
                                nextLineNo = 1;
                            const line = editor.getLine(nextLineNo);
                            SetCaretPosition(line,line.content.length);
                        } else {
                            const line = editor.getLine(nextLineNo);
                            SetCaretPosition(line,0);
                        }
                    } else {
                        if (firstLineAfterDeletion.textContent.trim() != ''){
                            startLine.setContent(firstLineAfterDeletion.textContent);
                        } 
                        if (lastLineAfterDeletion.textContent.trim() != '') {
                            const line = editor.getLine(lastLineNo - removedLines.length);
                            line.setContent(lastLineAfterDeletion.textContent);
                            SetCaretPosition(line,0);
                        } else {
                            SetCaretPosition(startLine,caretPos);
                        }
                    }
                } else if(editor.selectedLines !== null && editor.selectedLines.length == 1){
                    const lineNo = parseInt(editor.selectedLines[0].dataset.lineNumber);
                    const line = editor.getLine(lineNo)
                    const caretPos = getHtmlCaretPos(editor.selectedLines[0]);
                    range.deleteContents();
                    line.setContent(editor.selectedLines[0].textContent);
                    SetCaretPosition(line,caretPos);
                } else {
                    return;
                }
            } else {
                // Delete whole line if line is empty
                if (that.textContent.trim().length == 0 ){
                    const next = editor.removeLine(lineNo);
                    if (next !== null){
                        SetCaretPosition(next,editor.caretPos);
                    }
                } 
                else {
                    // if at end of line, delete next line and append content of that line to current line
                    if (caretPos == that.textContent.length) {
                        const next = editor.getLineByNumber(lineNo+1);
                        if (next){
                            const text = next.textContent.trim();
                            editor.removeLine(lineNo+1);
                            that.textContent += text;
                            SetCaretPosition(that,caretPos);
                            break;
                        }
                    }
                    // propagate event further up
                    return;
                }
            }
          }
          break;
        case "r":
            //jump to rule selection
            console.log('r',lineNo);
            if (that.textContent.trim().length > 0 && event.ctrlKey === true ) {
                console.log('jump to rule');
                if(that.nextElementSibling) {
                    that.nextElementSibling.focus();
                }
            break;
            }
            if (event.ctrlKey)
                return;
        case "d":
            //delete current line
            console.log('d',lineNo);
            if (lineNo > 0 && event.ctrlKey === true ) {
                console.log('delete line');
                const next = editor.removeLine(lineNo);
                if (next !== null)
                    SetCaretPosition(next,editor.caretPos);
                break;
            } 
        default:
            if (event.ctrlKey || event.key == 'Shift')
                return;
            
            const sel = window.getSelection();
            if (sel.type === 'None')
                return;
            if (sel.type === 'Range') {
                const range = sel.getRangeAt(0);
                // if a range was selected and any character was typed
                if(editor.selectedLines !== null && editor.selectedLines.length == 1){
                    const lineNo = editor.selectedLines[0].dataset.lineNumber;
                    const caretPos = getHtmlCaretPos(editor.selectedLines[0]);
                    range.deleteContents();
                    const line = editor.getLine(lineNo);
                    line.setContent(editor.getLineByNumber(lineNo).textContent);
                    SetCaretPosition(line,caretPos);
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
       const newLine = editor.addEmptyLineAfter(currentLine++);
       newLine.setContent(lines[i]);
       newLine.setLevel(indentLevel);
       lastLine = newLine;
    }
    SetCaretPosition(lastLine,lastLine.content.length);
}

function handleBlur(event) {
    console.log('focusout')
    const that = event.target;
    const lineNo = that.dataset.lineNumber;
    if (that.classList.contains('rule')){
        //clean up
        document.querySelectorAll('.line').forEach(line => {
            line.classList.remove('selectedLine');
        });
        //remove whitespace
        if(that.textContent.trim() == ''){
            that.textContent='';
        }
        // remove highlights/hints
        const line = editor.getLine(lineNo);
        line.setSyntaxHighlighting(true);
    }
    if (that.classList.contains('line')) {
        const line = editor.getLine(lineNo);
        //update content based on text changes
        line.setContent(that.textContent);
        line.setSyntaxHighlighting(true);
    }
    editor.checkFitchLines();
}

function handleFocus(event) {
    console.log('focusin')
    const that = event.target;
    const lineNo = that.dataset.lineNumber;
    if (that.classList.contains('rule')) {
        highlightFormulaParts(lineNo)
        //if rule was already selected, start at end
        if (that.textContent.length > 0){
            const indexColon = that.textContent.indexOf(':');
            if (indexColon >= 0){
                event.preventDefault();
                SetCaretPosition(that,that.textContent.length);
                ruleSelected = true;
            }
        } else {
            ruleSelected = false;
        }
    }
    if (that.classList.contains('line')) {
        editor.selectedLines = [that];
    }
}


const editor = new Editor();
window.addEventListener("load", function(){
    const ed = document.getElementById('editor');
    
    ed.addEventListener('paste', handlePaste);
    ed.addEventListener("focusout", handleBlur);
    ed.addEventListener("focusin", handleFocus);
    // because of range selection with mouse
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener('keyup', handleKeyup);

    //register on window to capture mouseups everywhere (i.e. if user selects fast or imprecisely)
    window.addEventListener("mousedown", handleMouse);
    window.addEventListener('mouseup', handleMouse);
    
    editor.addPremise('Peter');
    editor.addPremise('Leo');
    editor.addLine('Peter ∧ Leo');
    editor.addLine('∀x∀y(Peter(x,y) ∧ Hans(y)) → ∃z(Leo(z))');
    editor.addLine('¬∀x∀y(Peter(x) ∧ Hans(y)) → ∃z(Leo(z))');
    editor.addLine('hans = peter');
    editor.addLine('Hans ∨ Peter ∨ Leo');
    editor.setSyntaxHighlighting(true);
});


function parseText(text){
    return new Parser(new Scanner(text.trim(),0).scanTokens()).parse();
}

function parseLineDiv(div) {
    const text = div.textContent.trim();

    if ( text != '' && div.dataset.lineNumber){
          console.log('check line')
          const parsedFormula = new Parser(new Scanner(text,div.dataset.lineNumber).scanTokens()).parse();
          if (parsedFormula) {
              console.log(parsedFormula)
              div.classList.add('lineOk');
              div.classList.remove('lineError');
              return parsedFormula;
          } else {
              div.classList.add('lineError');
              div.classList.remove('lineOk');
              return null;
              console.log('no valid formula in line', div.dataset.lineNumber)
          }
    }
}

// Move caret to a specific point in a DOM element
function SetCaretPosition(el, pos){
    //console.log('caret', pos, el)
    if (!el)
        return -1;
    if (el instanceof Line){
        el.setSyntaxHighlighting(false);
        el = el.getDom();
    }
    if (el.classList.contains('line')){
        editor.selectedLines = [el];
        el.contentEditable = 'true';
        if(editor.activeLine && editor.activeLine != el){
                editor.activeLine.contentEditable = 'false';
        }
        editor.activeLine = el;
    }
    
    if (el.childNodes.length == 0) {
        el.appendChild(document.createTextNode(''));           
    }
    //XXX FIXME
    // Loop through all child nodes
    for(let node of el.childNodes){
        if(node.nodeType == 3){ // we have a text node
            pos = Math.min(node.length,pos);
            editor.caretPos = pos;
            // finally add our range
            let range = document.createRange(),
                sel = window.getSelection();
            range.setStart(node,pos);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            return -1; // we are done
            
        }
    }
    return pos; // needed because of recursion stuff
}

function SetRangePosition(element, start, end){
    const textNode = element.childNodes[0];
    const range = document.createRange();
    range.setStart(textNode,start);
    range.setEnd(textNode,end);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

function getHtmlCaretPos(element){
    const range = window.getSelection().getRangeAt(0);
    const copyRange = range.cloneRange();
    copyRange.selectNodeContents(element);
    copyRange.setEnd(range.endContainer, range.endOffset);
    const endPos = copyRange.toString().trimStart().length;
    if (range.collapsed)
        return endPos;
    //a range was selected, get start position
    copyRange.setEnd(range.startContainer, range.startOffset);
    const startPos = copyRange.toString().trimStart().length;
    return startPos < endPos ? startPos : endPos;
}

function getHtmlRangePos(element){
    const range = window.getSelection().getRangeAt(0);
    const copyRange = range.cloneRange();
    copyRange.selectNodeContents(element);
    copyRange.setEnd(range.endContainer, range.endOffset);
    const endPos = copyRange.toString().trimStart().length;
    copyRange.setEnd(range.startContainer, range.startOffset);
    const startPos = copyRange.toString().trimStart().length;
    return [startPos, endPos];
}

function getCaretPosition() {
    const sel = window.getSelection();
    if (sel) 
        return sel.anchorOffset;
    return -1;
}

function showCaretPos(event) {
  let el = event.target;
  let caretPosEl = document.getElementById("caretPos");
  if (!editor.selectedLines)
    return;
  const line = editor.selectedLines[0].dataset.lineNumber;
  caretPosEl.textContent = "Caret position in line: " + line + " at index: " + editor.caretPos; //getCaretCharacterOffsetWithin(el);
}


function highlightFormulaParts(lineNumber,...matches){
    const matchOperatorClassName = ' highlightOperatorOk';
    const matchFormulaClassName = ' highlightFormulaOk';
    const line = editor.getLine(lineNumber);
    
    if (!line) return;

    const domLine = editor.getLineByNumber(lineNumber);
    const formula = line.formula;
    if (!formula) {
        console.log(fitcherror.token)
        const errorpos = fitcherror.token.pos;
        const errorLength = fitcherror.token.lexeme.length;
        const term = fitcherror.token.lexeme;
        domLine.innerHTML = domLine.textContent.substring(0,errorpos) + `<span class="wavy">${term} </span>` + domLine.textContent.substring(errorpos+errorLength);
        return;
    }
        

    let matchOperator = null;
    let matchFormulas = []
    for (const match of matches){
        if (typeof match == 'number' ) {
            matchOperator = match;
        } else if (match instanceof Formula){
            matchFormulas.push(match);
        }
    }

    // try to highlight corresponding logical connective in current formula
    if (formula.connective) {
        // -> / <->
        const connective = formula.connective;
        const offset = connective.pos;
        const length = connective.lexeme.length;
        const content = domLine.textContent;
        const before = content.substring(0,offset);
        const after =  content.substring(offset+length);
        const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
        const beforeFormula = parseText(before);
        let foundForm = false;
        if (beforeFormula) {
            const matchForm = String(beforeFormula);
            for (const form of matchFormulas){
                if (String(form) == matchForm){
                    foundForm = true;
                    break;
                }
            }
        }
        const formMatch = foundForm ? matchFormulaClassName : '';
        const tokenCss = line.getTokenCssClass(connective);
        domLine.innerHTML = `<span class='connectivePart${formMatch}'>${before}</span><span class='connectiveHighlightBinary${opMatch} ${tokenCss}'>${connective.lexeme}</span><span class='connectivePart'>${after}</span>`;
    } else if (formula.connectives) {
        // and / or
        let html = '';
        let content = domLine.textContent;
        let i = 0;
        // FIXME odd number of connectors
        for (const connective of formula.connectives){
            const offset = connective.pos - i;
            const length = connective.lexeme.length;
            const before = content.substring(0,offset);
            const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
            const beforeFormula = parseText(before);
            let foundForm = false;
            if (beforeFormula) {
                const matchForm = String(beforeFormula);
                for (const form of matchFormulas){
                    if (String(form) == matchForm){
                        foundForm = true;
                        break;
                    }
                }
            }
            const formMatch = foundForm ? matchFormulaClassName : '';
            const tokenCss = line.getTokenCssClass(connective);
            html += `<span class='connectivePart${formMatch}'>${before}</span><span class='connectiveHighlightBinary${opMatch} ${tokenCss}'>${connective.lexeme}</span>`;
            i = offset + length;
            content = content.substring(i);
        }
        const beforeFormula = parseText(content);
        let foundForm = false;
        if (beforeFormula) {
            const matchForm = String(beforeFormula);
            for (const form of matchFormulas){
                if (String(form) == matchForm){
                    foundForm = true;
                    break;
                }
            }
        }
        const formMatch = foundForm ? matchFormulaClassName : '';
        html += `<span class='connectivePart${formMatch} '>${content}</span>`;
        domLine.innerHTML = html;
    } else if (formula.operator) {
        // not
        const connective = formula.operator;
        const offset = connective.pos;
        const length = connective.lexeme.length;
        const content = domLine.textContent;
        const before = content.substring(0,offset);
        const after =  content.substring(offset+length);
        const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
        const tokenCss = line.getTokenCssClass(connective);
        domLine.innerHTML = `${before}<span class='connectiveHighlightUnary${opMatch}  ${tokenCss}'>${connective.lexeme}</span><span class='connectivePart'>${after}</span>`;
    } else if (formula.quantifier){
        // universal / existential
        const connective = formula.quantifier;
        const offset = connective.pos;
        const length = formula.variable.pos + formula.variable.lexeme.length;
        const content = domLine.textContent;
        const before = content.substring(0,offset);
        const after =  content.substring(offset+length);
        const opMatch = connective.type == matchOperator ? matchOperatorClassName : '';
        const tokenCss = line.getTokenCssClass(connective);
        domLine.innerHTML = `${before}<span class='connectiveHighlightUnary${opMatch}  ${tokenCss}'>${connective.lexeme}${formula.variable}</span><span class='connectivePart'>${after}</span>`;
    }
}