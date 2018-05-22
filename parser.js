const TokenType = Object.freeze({
    // Single-character tokens.
    LEFT_PAREN:0, RIGHT_PAREN:1, COMMA:2, MINUS:3, PLUS:4, SEMICOLON:5, SLASH:6, STAR:7,

    // One or two character tokens.
    EQUAL:8, GREATER:9, GREATER_EQUAL:10, LESS:11, LESS_EQUAL:12,

    // Literals.
    IDENTIFIER:13, NUMBER:14,

    // Logical tokens
    AND:15, OR:16, NOT:17, TRUE:18, FALSE:19, IMPL:20, BI_IMPL:21, FOR_ALL:22, EXISTS:23,

    EOF:24
});

class Token {
    constructor(type, lexeme, literal, line=-1, pos=-1){
        this.type = type;
        this.lexeme = lexeme;
        this.literal = literal;
        this.line = line;
        this.pos = pos;
    }

    [Symbol.toPrimitive](hint) {
        switch (hint) {
            case "string":
                return this.toString(); 
            case "number":
                return this.type;
            case "default":
                return this.toString();
        }
    }
    toString(){
        switch (this.type) {
            case TokenType.AND:
                return '∧';
            case TokenType.OR:
                return '∨';
            case TokenType.NOT:
                return '¬';
            case TokenType.TRUE:
                return '⊤';
            case TokenType.FALSE:
                return '⊥';
            case TokenType.IMPL:
                return '→';
            case TokenType.BI_IMPL:
                return '↔';
            case TokenType.FOR_ALL:
                return '∀';
            case TokenType.EXISTS:
                return '∃';
        }
        return this.lexeme;
    }
};



class Scanner {
    constructor(source, line){
        this.source = source;
        this.line = line;

        this.keywords = new Map();
        this.keywords.set("and", TokenType.AND);
        this.keywords.set("or", TokenType.OR);
        this.keywords.set("not", TokenType.NOT);
        this.keywords.set("FA", TokenType.FOR_ALL);
        this.keywords.set("EX", TokenType.EXISTS);
        this.keywords.set("bottom", TokenType.FALSE);
        this.keywords.set("false", TokenType.FALSE);
        this.keywords.set("true", TokenType.TRUE);
        this.keywords.set("iff", TokenType.BI_IMPL);

        this.start = 0;
        this.current = 0;

        this.tokens = [];
    }

    scanTokens() {
        while (! this.isAtEnd()) {
            // We are at the beginning of the next lexeme.
            this.start = this.current;
            this.scanToken();
        }
        this.tokens.push(new Token(TokenType.EOF, "", null, this.line, this.start));
        return this.tokens;
    }
    
    isAtEnd() {
        return this.current >= this.source.length;
    }

    scanToken() {
        const c = this.advance();
        switch (c) {
            case '(' :
                this.addToken(TokenType.LEFT_PAREN);
                break;
            case ')' :
                this.addToken(TokenType.RIGHT_PAREN);
                break;
            case ',' :
                this.addToken(TokenType.COMMA);
                break;
            case '-' :
                this.addToken(this.match('>') ? TokenType.IMPL : TokenType.MINUS);
                break;
            case '+' :
                this.addToken(TokenType.PLUS);
                break;
            case ';' :
                this.addToken(TokenType.SEMICOLON);
                break;
            case '*' :
                this.addToken(TokenType.STAR);
                break;
            case '!' :
                this.addToken(TokenType.NOT);
                break;
            case '∧' :
                this.addToken(TokenType.AND);
                break;
            case '∨' :
                this.addToken(TokenType.OR);
                break;
            case '¬' :
                this.addToken(TokenType.NOT);
                break;
            case '→' :
                this.addToken(TokenType.IMPL);
                break;
            case '∀' :
                this.addToken(TokenType.FOR_ALL);
                break;
            case '∃' :
                this.addToken(TokenType.EXISTS);
                break;
            case '⊤' :
                this.addToken(TokenType.TRUE);
                break;
            case '⊥' :
                this.addToken(TokenType.FALSE);
                break;
            case '↔' :
                this.addToken(TokenType.BI_IMPL);
                break;
            case '⇔' :
                this.addToken(TokenType.BI_IMPL);
                break;
            case '=' :
                this.addToken(this.match('>') ? TokenType.IMPL : TokenType.EQUAL);
                break;
            case '<' :
                if (this.match('=')) {
                    if (this.match('>'))
                        this.addToken(TokenType.BI_IMPL);
                    else
                        this.addToken(TokenType.LESS_EQUAL);
                } else if (this.match('-') && this.match('>') )
                    this.addToken(TokenType.BI_IMPL);
                else
                    this.addToken(TokenType.LESS);
                break;
            case '>' :
                this.addToken(this.match('=') ? TokenType.GREATER_EQUAL : TokenType.GREATER);
                break;
            case '/' :
                if (this.match('/')) {
                    // A comment goes until the end of the line.
                    while (this.peek() != '\n' && !this.isAtEnd())
                        this.advance();
                } else {
                    this.addToken(TokenType.SLASH);
                }
                break;

            case ' ' :
            case '\r' :
            case '\t' :
                // Ignore whitespace.
                break;

            case '\n' :
                
                //this.line++;
                break;

            default :
                if (this.isDigit(c)) {
                    this.number();
                } else if (this.isAlpha(c)) {
                    this.identifier();
                } else {
                    // TODO: coalesce all invalid characters?
                    //Fitch.error(line, "Unexpected character.");
                }
                break;
        }
    }

    isDigit(c) {
        return c >= '0' && c <= '9';
    }

    isAlpha(c) {
        return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
    }

    isAlphaNumeric(c) {
        return this.isAlpha(c) || this.isDigit(c);
    }

    identifier() {
        while (this.isAlphaNumeric(this.peek()))
            this.advance();

        // See if the identifier is a reserved word.
        const text = this.source.substring(this.start, this.current);

        let type = this.keywords.get(text);
        if (type == null)
            type = TokenType.IDENTIFIER;
        this.addToken(type);
    }

    number() {
        while (this.isDigit(this.peek()))
            this.advance();

        // Look for a fractional part.
        if (this.peek() == '.' && this.isDigit(this.peekNext())) {
            // Consume the "."
            this.advance();

            while (this.isDigit(this.peek()))
                this.advance();
        }

        this.addToken(TokenType.NUMBER, parseFloat(this.source.substring(this.start, this.current)));
    }

    advance() {
        return this.source.charAt(this.current++);
    }

    addToken(type, literal = null) {
        const text = this.source.substring(this.start, this.current);
        this.tokens.push(new Token(type, text, literal, this.line, this.start));
    }

    match(expected) {
        if (this.isAtEnd())
            return false;
        if (this.source.charAt(this.current) != expected)
            return false;

        this.current++;
        return true;
    }

    peek() {
        if (this.isAtEnd())
            return '\0';
        return this.source.charAt(this.current);
    }

    peekNext() {
        if (this.current + 1 >= this.source.length)
            return '\0';
        return this.source.charAt(this.current + 1);
    }
};

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.current = 0;
    }

    error(token, message) {
        //XXX Fitch.error(token, message);
        return new ParseError(token, message);
    }

    match(...types){
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    advance(){
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    peek(){
        return this.tokens[this.current];
    }

    previous() {
        return this.tokens[this.current-1];
    }

    consume(type, message) {
        if (this.check(type)) return this.advance();
        throw this.error(this.peek(), message);
    }

    isAtEnd() {
        return this.peek().type == TokenType.EOF;
    }

    check(tokenType) {
        if (this.isAtEnd()) return false;
        return this.peek().type == tokenType;
    }

    synchronize() {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().type == TokenType.SEMICOLON) return;
            this.advance();
        }
    }

    parse(){
        try {
            const form = this.e0();
            this.checkIsAtEOF();
            return form;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    checkIsAtEOF(){
        if(this.peek().type != TokenType.EOF){
            throw this.error(this.peek(), "Unexpected token");
        }
    }

    // recursive decent parsing ahead
    e5(){
        if (this.match(TokenType.LEFT_PAREN)) {
            const left = this.e0();
            this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression.");
            return left;
        }
        const term = this.term();
        if (this.match(TokenType.EQUAL)){
            const connective = this.previous();
            const right = this.term();
            return new FormulaEquality(term,connective,right);
        }
        return term;
    }
    e4(){
        if (this.match(TokenType.NOT)) {
            const operator = this.previous();
            const right = this.e0();
            return new FormulaNot(operator, right);
        }
        return this.e5();
    }
    e3(){
        const left = this.e4();
        if (this.match(TokenType.AND)) {
            const formulas = [];
            const connectives = [];
            formulas.push(left);
            connectives.push(this.previous());
            formulas.push(this.e5());
            while (this.match(TokenType.AND)){
                connectives.push(this.previous());
                formulas.push(this.e5());
            }
            return new FormulaAnd(formulas,connectives);
        }
        return left;
    }
    e2(){
        const left = this.e3();
        if (this.match(TokenType.OR)) {
            const formulas = [];
            const connectives = [];
            formulas.push(left);
            connectives.push(this.previous());
            formulas.push(this.e5());
            while (this.match(TokenType.OR)){
                connectives.push(this.previous());
                formulas.push(this.e5());
            }
            return new FormulaOr(formulas,connectives);
        }
        return left;
    }

    e1(){
        if (this.match(TokenType.EXISTS,TokenType.FOR_ALL)) {
            const quantifier = this.previous();
            if(this.match(TokenType.IDENTIFIER)) {
                const variable = this.previous();
                const right = this.e0();
                return new FormulaQuantified(quantifier, variable, right);
            }
            throw this.error(peek(),"Expected a variable after quantification.");
        }
        return this.e2();
    }
    e0() {
        const left = this.e1();
        if (this.match(TokenType.IMPL)) {
            const connective = this.previous();
            const right = this.e1(); 
            return new FormulaImpl(left, connective, right);
        } else if (this.match(TokenType.BI_IMPL)) {
            const connective = this.previous();
            const right = this.e1(); 
            return new FormulaBiImpl(left, connective, right);
        }
        return left;
    }

    term(){
        if(this.match(TokenType.TRUE, TokenType.FALSE, TokenType.NUMBER)){
            return new TermConstant(this.previous());
        }
        if(this.match(TokenType.IDENTIFIER)){
            const identifier = this.previous();
            if (this.match(TokenType.LEFT_PAREN)){
                //FIXME allow arity 0 => Tet() ?
                if (this.match(TokenType.RIGHT_PAREN)) {
                    console.log('empty arg list');
                    return new TermFunction(identifier,[]);
                }
                const terms = this.term_list();
                this.consume(TokenType.RIGHT_PAREN,"Expected ')' after argument list.");
                return new TermFunction(identifier,terms);
            }
            return new TermVariable(identifier);
        }
        throw this.error(this.peek(), "Expected a term.");
    }

    term_list(){
        const terms = [];
        const term = this.term();
        terms.push(term);
        while (this.match(TokenType.COMMA)){
            terms.push(this.term());
        }
        return terms;
    }
}

class ParseError extends Error {
  constructor(token, ...params) {
    super(...params);
    this.token = token;
    this.date = new Date();
  }
}


class Formula {
    constructor(){
        this.isPremise = false;
        this.isGoal = false;
        this.isJustified = false;
        this.rule = null;
        this.line = 0;
    }
    check(){
        if (! (this.rule instanceof Rule)) {
            console.error('no rule given');
            return false;
        }
        return this.rule.validate(this);
    }
    setRule(rule) {
        this.rule = rule;
    }
    *[Symbol.iterator](){
        yield null;
    }
    replaceVariable(oldVar,newVar){}
}

class FormulaUnary extends Formula {
    constructor(operator, right) {
        super();
        this.operator = operator; //Token
        this.right = right;
        this.line = operator.line;
    }
    toString(){
        return this.operator + this.right;
    }
    *[Symbol.iterator](){
        yield this.right;
        for (const term of this.right){
            if (term !== null)
                yield term;
        }
    }
    replaceVariableName(oldName,newName){
        this.right.replaceVariableName(oldName,newName);
    }

}
class FormulaNot extends FormulaUnary {
}
class FormulaBinary extends Formula {
    constructor(left, connective, right) {
        super();
        this.left = left;
        this.connective = connective; //Token
        this.right = right;
        this.line = left.line;
    }
    toString(){
        return '( ' + this.left + ' ' + this.connective + ' ' + this.right + ' )';
    }
    *[Symbol.iterator](){
        yield this.left;
        for (const term of this.left){
            if (term !== null)
                yield term;
        }
        yield this.right;
        for (const term of this.right){
            if (term !== null)
                yield term;
        }
    }
    replaceVariableName(oldName,newName){
        this.left.replaceVariableName(oldName,newName);
        this.right.replaceVariableName(oldName,newName);
    }
}
class FormulaImpl extends FormulaBinary {
}
class FormulaBiImpl extends FormulaBinary {
}
class FormulaEquality extends FormulaBinary {
}
class FormulaQuantified extends Formula {
    constructor(quantifier, variable, right) {
        super();
        this.quantifier = quantifier; //Token
        this.variable = variable; //Token
        this.right = right;
        this.line = quantifier.line;
    }
    toString(){
        return this.quantifier + this.variable + this.right;
    }
    *[Symbol.iterator](){
        yield this.right;
        for (const term of this.right){
            if (term !== null)
                yield term;
        }
    }
    bind(variable){
        this.right.replaceVariableName(String(this.variable),String(variable));
        return this.right;
    }
    replaceVariableName(oldName,newName){
        this.right.replaceVariableName(oldName,newName);
    }
}
class FormulaAnd extends Formula {
    constructor(terms, connectives ) {
        super();
        this.terms = terms; //Array Formula
        this.connectives = connectives; //Array Token
        this.line = terms[0].line;
    }
    isEqualTo(formula){
        if (formula instanceof FormulaAnd){
            if (this.term.length !== formula.terms.length)
                return false;

            for (const i in this.terms) {
                if (! this.terms[i].isEqualTo(formula.terms[i]))
                    return false;
            }
            return true;
        }
        return false;
    }
    toString(){
        return '( ' + this.terms.join(' ∧ ') + ' )';
    }
    *[Symbol.iterator](){
        for (const term of this.terms){
            yield term;
            for (const t of term) {
                if (t !== null)
                    yield t;
            }
        }
    }
    replaceVariableName(oldName,newName){
        this.terms.forEach(term => term.replaceVariableName(oldName,newName));
    }
}
class FormulaOr extends Formula {
    constructor(terms, connectives ) {
        super();
        this.terms = terms; //Array Formula
        this.connectives = connectives; //Array Token
        this.line = terms[0].line;
    }
    toString(){
        return '( ' + this.terms.join(' ∨ ') + ' )';
    }
    *[Symbol.iterator](){
        for (const term of this.terms){
            yield term;
            for (const t of term) {
                if (t !== null)
                    yield t;
            }
        }
    }
    replaceVariableName(oldName,newName){
        this.terms.forEach(term => term.replaceVariableName(oldName,newName));
    }
}

class Term extends Formula {
    constructor(name) {
        super();
        this.name = name; //Token
        this.line = name.line;
    }
    toString(){
        let str = '';
        if (this.name instanceof Token){
            str += this.name.lexeme;
        }
        if(this.args instanceof Array){
            str +='('+ this.args.join() + ')';
        }
        return str;
    }

}
class TermVariable extends Term {
    replaceVariableName(oldName,newName){
        if (this.name.lexeme === oldName) {
            this.name.lexeme = newName;
        }
    }  
}
class TermConstant extends Term {
}
class TermFunction extends Term {
    constructor(name, args) {
        super(name);
        this.args = args; //Array Formula
        this.line = name.line;
    }
    *[Symbol.iterator](){
        for (const term of this.args){
            yield term;
            for (const t of term) {
                if (t !== null)
                    yield t;
            }
        }
    }
    replaceVariableName(oldName,newName){
        this.args.forEach(term => term.replaceVariableName(oldName,newName));
    }
}

class Rule {
    validate(formula){
        console.error('validate rule not implemented')
        return false;
    }
    toString(){
        let str = this.constructor.name;
            str += '('
        if (this.sources){
            str += this.sources.map(({line}) => line).join(',')
        } else if (this.source) {
            str += this.source.line;
        }
        str += ')'
        return str;
    }
}
class RuleAndElim extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof FormulaAnd)) {
            console.error('Expected formula of type FormulaAnd as source');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }
        for (const term of this.source.terms){
            //FIXME check for smaller line no and scope
            console.log(String(formula),String(term))
            if (String(formula) === String(term))
                return true;
        }
        return false;
    }
}
class RuleAndIntro extends Rule{
    constructor(...sources){
        super();
        this.sources = sources;
    }
    validate(formula) {
        this.sources.forEach(sourceForm => {
            if (!(sourceForm instanceof Formula)) {
                console.error('Expected a formula as source');
                return false;
            }
        });
        if (!(formula instanceof FormulaAnd)) {
            console.error('Expected formula to validate to be of type FormulaAnd');
            return false;
        }

        let found = false;
        for (const term of formula.terms){
            //FIXME check for smaller line no and scope
            for (const sourceTerm of this.sources){
                if(sourceTerm.line > term.line){
                    console.error('Source formula must occur before current formula')
                    return false;
                }
                //console.log(String(term),String(sourceTerm))
                if (String(term) === String(sourceTerm)){
                    found = true;
                    break;
                }
            }
            if (!found){
                console.error(`Did not find ${term} in any source formula`);
                return false;
            }
        }
        
        return true;
    }
}

class RuleNegationElim extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof FormulaNot)) {
            console.error('Expected formula of type FormulaNot as source');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }
        if (!(this.source.right instanceof FormulaNot)) {
            console.error('Expected source formula of being double-negation');
            return false;
        }
        //FIXME check for smaller line no and scope
        //console.log(String(formula),String(this.source.right.right))
        if (String(formula) === String(this.source.right.right))
            return true;
        
        return false;
    }
}

class RuleOrIntro extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof Formula)) {
            console.error('source must be a formula');
            return false;
        }
        if (!(formula instanceof FormulaOr)) {
            console.error('Expected formula of type FormulaOr');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }
        for (const term of formula.terms){
            console.log(String(term),String(this.source))
            if (String(term) === String(this.source))
                return true;
        }
        return false;
    }
}

class RuleBottomElim extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof Term)) {
            console.error('source must be a term');
            return false;
        }
        if (!(formula instanceof Formula)) {
            console.error('Expected a formula');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }
        if (this.source.name.type === TokenType.FALSE){
            return true;
        }
        return false;
    }
}

class RuleBottomIntro extends Rule{
    constructor(...sources){
        super();
        this.sources = sources;
    }
    validate(formula) {
        if (!(this.sources instanceof Array) || this.sources.length != 2) {
            console.error('Exactly two premises are needed as source');
            return false;
        }
        this.sources.forEach(sourceForm => {
            if (!(sourceForm instanceof Formula)) {
                console.error('Expected a formula as source');
                return false;
            }
        });

        if (!(formula instanceof Term)) {
            console.error('Expected formula to validate to be of type Term');
            return false;
        }
        if (formula.name.type !== TokenType.FALSE){
            console.error('Expected formula to validate to be of type TermConstant Bottom/False');
            return false;
        }

        //FIXME check for smaller line no and scope
        let sourceTerm1 = this.sources[0];
        let sourceTerm2 = this.sources[1];
        if(sourceTerm1.line > formula.line || sourceTerm2.line > formula.line ){
            console.error('Source formula must occur before current formula')
            return false;
        }
        let notsTerm1 = 0;
        let notsTerm2 = 0;
        while (sourceTerm1 instanceof FormulaNot) {
            sourceTerm1 = sourceTerm1.right;
            notsTerm1++;
        }
        while (sourceTerm2 instanceof FormulaNot) {
            sourceTerm2 = sourceTerm2.right;
            notsTerm2++;
        }
        if (String(sourceTerm1) === String(sourceTerm2) && notsTerm1 !== notsTerm2 ) {
            return true;
        }

        return false;
    }
}

class RuleImplicationElim extends Rule{
    constructor(...sources){
        super();
        this.sources = sources;
    }
    validate(formula) {
        if (!(this.sources instanceof Array) || this.sources.length != 2) {
            console.error('Exactly two premises are needed as source');
            return false;
        }
        if (!(formula instanceof Formula)) {
            console.error('Expected formula to validate to be of type Formula');
            return false;
        }

        let formulaImpl = null;
        let formulaAntecedent = null;
        this.sources.forEach(sourceForm => {
            if (sourceForm instanceof FormulaImpl) {
                if(formulaImpl === null)
                    formulaImpl = sourceForm;
                else {
                    // we got 2 implication formulae
                    // check which is which
                    if (String(sourceForm) === String(formulaImpl.left)) {
                        formulaAntecedent = sourceForm;
                    } else if (String(sourceForm.left) === String(formulaImpl)) {
                        [formulaImpl,formulaAntecedent] = [sourceForm, formulaImpl];
                    } else {
                        formulaAntecedent = sourceForm;
                    }
                }
            } else if (sourceForm instanceof Formula) {
                formulaAntecedent = sourceForm;
            } else {
                console.error('No valid formula given as source');
                return false;
            }
            if (sourceForm.line > formula.line){
                console.error('Source formula must occur before current formula')
                return false;
            }
        });
        if (formulaImpl === null) {
            console.error('Expected one Implication as source');
            return false;
        }
        if (formulaAntecedent === null) {
            console.error('Expected one Antecedent as source');
            return false;
        }

        if (String(formulaAntecedent) !== String(formulaImpl.left)) {
            console.error('Expected Antecedent to be present in Implication');
            return false;
        }
        if (String(formula) !== String(formulaImpl.right)) {
            console.error('Expected Consequent of Implication to match given formula');
            return false;
        }

        return true;
    }
}

class RuleBiImplicationElim extends Rule{
    constructor(...sources){
        super();
        this.sources = sources;
    }
    validate(formula) {
        if (!(this.sources instanceof Array) || this.sources.length != 2) {
            console.error('Exactly two premises are needed as source');
            return false;
        }
        if (!(formula instanceof Formula)) {
            console.error('Expected formula to validate to be of type Formula');
            return false;
        }

        this.sources.forEach(sourceForm => {
            if (!(sourceForm instanceof Formula)) {
                console.error('Expected source to be of type Formula');
                return false;
            }
            if (sourceForm.line > formula.line){
                console.error('Source formula must occur before current formula')
                return false;
            }
        });

        const [source1,source2] = this.sources;
        if (source1 instanceof FormulaBiImpl) {
            if (String(source1.left) === String(formula) && String(source1.right) === String(source2)) {
                return true;
            }
            if (String(source1.right) === String(formula) && String(source1.left) === String(source2)) {
                return true;
            }
        }
        if (source2 instanceof FormulaBiImpl) {
            if (String(source2.left) === String(formula) && String(source2.right) === String(source1)) {
                return true;
            }
            if (String(source2.right) === String(formula) && String(source2.left) === String(source1)) {
                return true;
            }
        }

        return false;
    }
}

class RuleReiteration extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof Formula)) {
            console.error('Expected source to be of type Formula');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }
        if (String(formula) !== String(this.source)) {
            console.error('Expected source formula to match current formula');
            return false;
        }
        return true;
    }
}

class RuleIdentityElim extends Rule{
    constructor(...sources){
        super();
        this.sources = sources;
    }
    validate(formula) {
        if (!(this.sources instanceof Array) || this.sources.length != 2) {
            console.error('Exactly two premises are needed as source');
            return false;
        }
        if (!(formula instanceof Formula)) {
            console.error('Expected formula to validate to be of type Formula');
            return false;
        }

        this.sources.forEach(sourceForm => {
            if (!(sourceForm instanceof Formula)) {
                console.error('Expected source to be of type Formula');
                return false;
            }
            if (sourceForm.line > formula.line){
                console.error('Source formula must occur before current formula')
                return false;
            }
        });
        
        let equality = null;
        let substitutionFormula = null;
        this.sources.forEach(sourceForm => {
            if (equality === null && (sourceForm instanceof FormulaEquality)) {
                equality = sourceForm;
            } else {
                substitutionFormula = sourceForm;
            }
        });

        if (equality === null){
            console.error('Expected one FormulaEquality in sources');
            return false;
        }

        if( String(formula) === String(substitutionFormula))
            return true;

        let skipCheck = 0;
        const subIterator = substitutionFormula[Symbol.iterator]();
        for (const term of formula) {
            if (skipCheck > 0) {
                --skipCheck;
                continue;
            }
            const substitutionTerm = subIterator.next().value;
            if(String(term) === String(substitutionTerm))
                continue;
            if(String(term) === String(equality.left) && String(substitutionTerm) === String(equality.right) ){
                console.log(String(term),' => ', String(equality.right))
                const sterms = [...term];
                if (sterms != ''){ // because [null] is cast to '' (empty string)
                    skipCheck = sterms.length;
                }
                continue;
            }
            if(String(term) === String(equality.right) && String(substitutionTerm) === String(equality.left) ){
                console.log(String(term),' <= ', String(equality.left))
                const sterms = [...term];
                if (sterms != ''){// because [null] is cast to '' (empty string)
                    skipCheck = sterms.length;
                }
                continue;
            }
            console.error(String(term),' != ',String(substitutionTerm))
            return false;
        }
        return true;
    }
}

class RuleUniversalElim extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(this.source instanceof FormulaQuantified)) {
            console.error('source must be a universal quantified formula');
            return false;
        }
        if (this.source.quantifier.type !== TokenType.FOR_ALL ) {
            console.error('source must be a universal quantified formula');
            return false;
        }
        if (!(formula instanceof Formula)) {
            console.error('Expected a formula');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }

        const it = formula[Symbol.iterator]();
        let diffTerm = null;
        for (const sourceTerm of this.source.right){
            const term = it.next().value;
            if (! (term instanceof TermVariable))
                continue;
            if (String(term) !== String(sourceTerm)){
                //TODO obj ref?
                diffTerm = term;
                break;
            }
        }

        if (String(this.source.bind(diffTerm)) === String(formula))
            return true;

        console.error(`Variable ${diffTerm} is not a valid substituition for ${this.source.variable} in this context`);
        return false;
    }
}

class RuleExistentialIntro extends Rule{
    constructor(source){
        super();
        this.source = source;
    }
    validate(formula) {
        if (!(formula instanceof FormulaQuantified)) {
            console.error('source must be a universal quantified formula');
            return false;
        }
        if (formula.quantifier.type !== TokenType.EXISTS) {
            console.error('source must be an existential quantified formula');
            return false;
        }
        if (!(this.source instanceof Formula)) {
            console.error('Expected source to be of formula');
            return false;
        }
        if(this.source.line > formula.line) {
            console.error('Source formula must occur before current formula')
            return false;
        }

        const it = this.source[Symbol.iterator]();
        let oldVar = null;
        let newVar = null;
        for (const term of formula.right){
            const sourceTerm = it.next().value;
            if (! (term instanceof TermVariable))
                continue;
            if (String(term) !== String(sourceTerm)){
                newVar = String(term);
                oldVar = String(sourceTerm);
                break;
            }
        }
        this.source.replaceVariableName(oldVar,newVar);
        if (String(this.source) === String(formula.right))
            return true;
        
        console.error(`Existential for ${formula.variable} can not be concluded in this context`);
        return false;
    }
}

class RuleImplicationIntro extends Rule{
    constructor(source){
        super();
        this.source = source; // subproof
    }
    validate(formula) {
        if (! (this.source instanceof Proof)) {
            console.error('Expected subproof for RuleImplicationIntro as source')
            return false;
        }
        if (! (formula instanceof FormulaImpl)) {
            console.error('Expected formula of type Implication')
            return false;
        }

        const antecedent = String(formula.left);
        const consequent = String(formula.right);
        let foundAntecedent = false;
        let foundConsequent = false;
        for (const premise of this.source.getPremises()){
            if(String(premise) === antecedent)
                foundAntecedent = true;
        }
        for (const term of this.source.getSteps()){
            if(String(term) === consequent)
                foundConsequent = true;
        }
        if (!foundAntecedent) {
            console.error('Antecedent missing in (detached) premise of subproof')
            return false
        }
        if (!foundConsequent) {
            console.error('Consequent not found in subproof')
            return false
        }
        return true;
    }
}

class RuleBiImplicationIntro extends Rule{
    constructor(...sources){
        super();
        this.sources = sources; // subproof
    }
    validate(formula) {
        if (!(this.sources instanceof Array) || this.sources.length != 2) {
            console.error('Exactly two subproofs are expected as source');
            return false;
        }

        if (! (formula instanceof FormulaBiImpl)) {
            console.error('Expected formula of type BiImplication')
            return false;
        }

        const antecedent1 = String(formula.left);
        const consequent1 = String(formula.right);
        const antecedent2 = consequent1;
        const consequent2 = antecedent1;

        let foundAntecedent1 = false;
        let foundConsequent1 = false;
        let foundAntecedent2 = false;
        let foundConsequent2 = false;

        for (const source of this.sources) {
            if (! (source instanceof Proof)) {
                console.error('Expected subproof for RuleBiImplicationIntro as source')
                return false;
            }
            for (const premise of source.getPremises()){
                if (String(premise) === antecedent1) {
                    for (const term of source.getSteps()){
                        if (String(term) === consequent1)
                            foundConsequent1 = true;
                    }
                    foundAntecedent1 = true;
                } else if (String(premise) === antecedent2) {
                    for (const term of source.getSteps()){
                        if (String(term) === consequent2)
                            foundConsequent2 = true;
                    }
                    foundAntecedent2 = true;
                }
            }
        }

        if (!foundAntecedent1) {
            console.error(`Antecedent ${antecedent1} missing in (detached) premise of any given subproof`)
            return false
        }
        if (!foundConsequent1) {
            console.error(`Consequent ${consequent1} not found in any given subproof`)
            return false
        }
        if (!foundAntecedent2) {
            console.error(`Antecedent ${antecedent2} missing in (detached) premise of any given subproof`)
            return false
        }
        if (!foundConsequent2) {
            console.error(`Consequent ${consequent2} not found in any given subproof`)
            return false
        }
        
        return true;
    }
}

class RuleNegationIntro extends Rule{
    constructor(source){
        super();
        this.source = source; // subproof
    }
    validate(formula) {
        if (! (this.source instanceof Proof)) {
            console.error('Expected subproof for RuleNegationIntro as source')
            return false;
        }
        if (! (formula instanceof FormulaNot)) {
            console.error('Expected formula of type Negation')
            return false;
        }

        const rightTerm = String(formula.right);
        let foundRightTerm = false;
        let foundBottom = false;
        for (const premise of this.source.getPremises()){
            if(String(premise) === rightTerm)
                foundRightTerm = true;
        }
        for (const term of this.source.getSteps()){
            if((term instanceof Term) && term.name.type === TokenType.FALSE)
                foundBottom = true;
        }
        if (!foundRightTerm) {
            console.error('Negated Term missing in (detached) premise of subproof')
            return false
        }
        if (!foundBottom) {
            console.error('Bottom not found in subproof')
            return false
        }
        return true;
    }
}

class RuleOrElim extends Rule{
    constructor(...sources){
        super();
        this.sources = sources; // subproof
    }
    validate(formula) {
        if (!(this.sources instanceof Array) || this.sources.length < 3) {
            console.error('Expected at least 3 sources');
            return false;
        }

        if (! (formula instanceof Formula)) {
            console.error('Expected a formula to validate')
            return false;
        }

        let subProofs = []
        let formOr = null;
        for (const source of this.sources) {
            if (source instanceof FormulaOr) {
                formOr = source;
            } else if ( source instanceof Proof) {
                subProofs.push(source);
            }
        }

        if (formOr === null) {
            console.error('Expected one Disjuntion as Source')
            return false;
        }
        if (formOr.terms.length !== subProofs.length) {
            console.error('Expected as many subproofs as there are terms in Disjunction')
            return false;
        }

        // XXX FIXME: check lines and subproof level

        let countValidsubProofs = 0;
        for ( const term of formOr.terms) {
            for (const proof of subProofs) {
                let foundTerm = false
                for (const premise of proof.getPremises()){
                    if (String(term) === String(premise)) {
                        for (const subformula of proof.getSteps()){
                            if (String(formula) === String(subformula)){
                                countValidsubProofs++;
                                break;
                            }
                        }
                        foundTerm = true;
                        break;
                    }
                }
                if (foundTerm)
                    break;
            }
        }

        if (countValidsubProofs !== subProofs.length) {
            console.error('Not all disjunctive terms have been proven in given subproofs')
            return false;
        }

        return true;

    }
}

class RuleUniversalIntro extends Rule{
    constructor(source){
        super();
        this.source = source; // subproof
    }
    validate(formula) {
        if (! (this.source instanceof Proof)) {
            console.error('Expected subproof for RuleUniversalIntro as source')
            return false;
        }
        if (! (formula instanceof FormulaQuantified)) {
            console.error('Expected formula of type Negation')
            return false;
        }
        if (formula.quantifier.type !== TokenType.FOR_ALL ) {
            console.error('Expected universal quantified formula')
            return false;
        }

        // check P(t,a,t) -> P(x,a,x)
        const lastTerm = this.source.getSteps()[this.source.getSteps().length - 1];
        const it = lastTerm[Symbol.iterator]();
        let oldVar = null;
        let newVar = null;
        for (const term of formula.right){
            const sourceTerm = it.next().value;
            if (! (term instanceof TermVariable))
                continue;
            if (String(term) !== String(sourceTerm)){
                newVar = String(term);
                oldVar = String(sourceTerm);
                break;
            }
        }

        const premise = this.source.getPremises()[this.source.getPremises().length - 1];
        if (!(premise instanceof TermVariable)) {
            console.error('No variable given for subproof');
            return false;
        }
        // FIXME check var in current and all other parent proofs
        if (oldVar !== String(premise)){
            console.error(`Expected free variable '${oldVar}' instead of '${premise}' in premise `);
            return false;
        }

        lastTerm.replaceVariableName(oldVar,newVar);
        if (String(lastTerm) === String(formula.right))
            return true;
        
        console.error(`universal for ${formula.variable} can not be concluded in this context`);
        return false;
    }
}


class RuleExistentialELim extends Rule{
    constructor(...sources){
        super();
        this.sources = sources; // subproof
    }
    validate(formula) {
        if (!(this.sources instanceof Array) || this.sources.length != 2) {
            console.error('Expected exactly 2 sources');
            return false;
        }

        if (! (formula instanceof Formula)) {
            console.error('Expected a formula to validate')
            return false;
        }

        let subProof = null;
        let existential = null;
        for (const source of this.sources) {
            if ((source instanceof FormulaQuantified) && source.quantifier.type === TokenType.EXISTS) {
                existential = source;
            } else if ( source instanceof Proof) {
                subProof = source;
            }
        }

        if (!subProof) {
            console.error('Expected one subproof as source')
            return false;
        }
        if (!existential) {
            console.error('Expected one existential quantified formula as source')
            return false;
        }

        // check P(t,a,t) <- P(x,a,x)
        const premise = subProof.getPremises()[subProof.getPremises().length - 1];
        const it = premise[Symbol.iterator]();
        let oldVar = null;
        let newVar = null;
        for (const term of existential.right){
            const premiseTerm = it.next().value;
            if (! (term instanceof TermVariable))
                continue;
            if (String(term) !== String(premiseTerm)){
                oldVar = String(term); // x
                newVar = String(premiseTerm); // a
                break;
            }
        }
        // FIXME check var in current and all other parent proofs

        // check if free var does not exist in conluded term
        for (const term of formula){
            if (! (term instanceof TermVariable))
                continue;
            if (String(term) === String(newVar)){
                console.error(`Variable ${newVar} occurs in concluded formula, which is not allowed`)
                return false;
            }
        }

        for (const subterm of subProof.getSteps()) {
            if ( String(subterm) === String(formula) ) {
                return true;
            } 
        }
        console.error(`Concluded formula '${formula}' was not found in subproof `)
        return false;
    }
}

class Proof {
    constructor(goal=null){
        this.parent = null;
        this.goal = null;
        this.steps = [];
        this.variables = new Map();
        this.stepNo = 0;
        this.line = 0;
        if (goal !== null)
            this.setGoal(goal);
    }
    addPremise(premise){
        const formula = parseLine(premise);
        formula.isPremise = true;
        this.addFormula(formula);
    }
    getPremises(){
        return this.steps.filter(f => f.isPremise);
    }
    addFormula(formula, rule=null){
        if (!(formula instanceof Formula)){
            formula = parseLine(formula);
        }
        if (rule instanceof Rule)
            formula.setRule(rule);
        this.steps[++this.stepNo] = formula;
    }
    Step(lineNo){
        return this.steps[lineNo];
    }
    getSteps(){
        return this.steps.filter(f => !f.isPremise);
    }
    removeStep(lineNo){
        this.steps.splice(lineNo,1)
    }
    setRuleForStep(lineNo, rule){}
    
    addSubProof(subProof){
        if (!(subProof instanceof Proof)) {
            console.error('Expected subproof');
            return;
        }
        subProof.parent = this;
        subProof.line = ++this.stepNo
        this.steps[this.stepNo] = subProof;
    }

    setGoal(goal){
        this.goal = new Parser(new Scanner(goal).scanTokens()).parse();
    }

    checkStep(lineNo){}
    check(){
        // XXX FIXME
        if (!this.parent) {
            this.steps.forEach(p => {
                if (p.rule)
                    console.log(p.line,String(p),String(p.rule))
                else if (p instanceof Proof) {
                    String(p)
                }
                else {
                    console.log(p.line,String(p))
                }
            });
        }
        
        let isValid = true;
        this.steps.filter(s => !s.isPremise).forEach(step => {
            
            const result = step.check();
            if (result === true){
                step.isJustified = true;
            } else {
                isValid = false;
                console.log(`Step ${step.line} is not valid`)
            }
        });
        if (this.parent)
            console.log('SubProof is valid: ', isValid)
        else
            console.log('Proof is valid: ', isValid)
        return isValid;
    }
    toString(){
        // XXX FIXME
        this.steps.forEach(p => {
            if (p.rule)
                console.log('--  ',p.line,'|',String(p),String(p.rule))
            else if (p instanceof Proof) {
                String(p)
            }
            else {
                console.log('--  ',p.line,'|',String(p))
            }

        })
        return 'subProof'
    }
}


let gLineNo = 0;
function parseLine(text){
    return new Parser(new Scanner(text,++gLineNo).scanTokens()).parse();
}

function justifyLine(line,rule){
    line.setRule(rule);
    const result = line.check();
    if (result === true){
        line.isJustified = true;
    }
    return result;
}

// -- test
// TODO: step, line or premise for rule reference??

let p = new Proof()
p.addPremise('A')
p.addPremise('B')
p.addPremise('(A ∧ B) -> C')
p.addFormula('A ∧ B', new RuleAndIntro(p.Step(1),p.Step(2)))
p.addFormula('C', new RuleImplicationElim(p.Step(4),p.Step(3)))
let sp = new Proof()
      sp.addPremise('A')
      sp.addFormula('C', new RuleReiteration(p.Step(5)))
p.addSubProof(sp)
p.addFormula('A -> C', new RuleImplicationIntro(sp))

p.check()

gLineNo = 0;
p = new Proof()
p.addPremise('¬A')
sp = new Proof()
      sp.addPremise('A')
      sp.addFormula('⊥', new RuleBottomIntro(p.Step(1),sp.Step(1)))
p.addSubProof(sp)
p.addFormula('¬A', new RuleNegationIntro(sp))

p.check()

gLineNo = 0;
p = new Proof()
p.addPremise('A')
p.addPremise('B')
let sp1 = new Proof()
      sp1.addPremise('A')
      sp1.addFormula('B', new RuleReiteration(p.Step(2)))
p.addSubProof(sp1)
let sp2 = new Proof()
      sp2.addPremise('B')
      sp2.addFormula('A', new RuleReiteration(p.Step(1)))
p.addSubProof(sp2)
p.addFormula('A <-> B', new RuleBiImplicationIntro(sp1,sp2))

p.check()



gLineNo = 0;
p = new Proof()
p.addPremise('A or B or C')
p.addPremise('Peter')
sp1 = new Proof()
      sp1.addPremise('A')
      sp1.addFormula('Peter', new RuleReiteration(p.Step(2)))
p.addSubProof(sp1)
sp2 = new Proof()
      sp2.addPremise('B')
      sp2.addFormula('Peter', new RuleReiteration(p.Step(2)))
p.addSubProof(sp2)
let sp3 = new Proof()
      sp3.addPremise('C')
      sp3.addFormula('Peter', new RuleReiteration(p.Step(2)))
p.addSubProof(sp3)
p.addFormula('Peter', new RuleOrElim(sp1,sp2,sp3,p.Step(1)))

p.check()


gLineNo = 0;
p = new Proof()
p.addPremise('∀x(P(x, t) → A(x, t))')
p.addPremise('∀x(P(x, t))')
sp = new Proof()
      sp.addPremise('c')
      sp.addFormula('P(c,t) -> A(c,t) ', new RuleUniversalElim(p.Step(1)))
      sp.addFormula('P(c,t)', new RuleUniversalElim(p.Step(2)))
      sp.addFormula('A(c,t)', new RuleImplicationElim(sp.Step(2),sp.Step(3)))
p.addSubProof(sp)
p.addFormula('∀x(A(x, t))', new RuleUniversalIntro(sp))
p.check()

gLineNo = 0;
p = new Proof()
p.addPremise('∃x(P(x, t) → A(x, t))')
p.addPremise('∀x(P(x, t))')
sp = new Proof()
      sp.addPremise('P(c, t) → A(c, t)')
      sp.addFormula('P(c,t)', new RuleUniversalElim(p.Step(2)))
      sp.addFormula('A(c,t)', new RuleImplicationElim(sp.Step(1),sp.Step(2)))
      sp.addFormula('∃x(A(x,t))', new RuleExistentialIntro(sp.Step(3)))
p.addSubProof(sp)
p.addFormula('∃x(A(x, t))', new RuleExistentialELim(sp,p.Step(1)))
p.check()

//testParser()

//......
// proof('A -> C')
// prem('A')
// prem('B')
// prem('(A ∧ B) -> C')
// step('A ∧ B', AndIntro(1,2))
// step('C', ImplicationElim(3,4))
// subproof('A')
//     step('C', Reiteration(5))
// endproof()
// step('A -> C', ImplicationElim(6))

// checkProof()


function testParser(){
const l1 = '∀x ∀t (Zuhause(x, t) → ¬AmTatort(x, t))'
const l2 = '(Tet(a) ∧ Tet(b) ∧ Tet(c) ∧ (Small(a) ∨ Small(b) ∨ Small(c)))'
const l3 = 'Tet(a) ∧ Tet(b) ∧ Tet(c) ∧ (Small(a) ∨ Small(b) ∨ Small(c))'
const l4 = 'Tet(a) ∧ (Tet(b) ∧ Tet(c))'
const l5 = '∀x∀y(P(f(x)) → ¬(P(x) → Q(f(y),x,z)))'
const l6 = ' Tet    (c) '
const l7 = ' Tet(peter) '
const l8 = ' Tet(peter) ∧ Tet(c) '
const l9 = '¬¬Peter'
const l10 = ' Peter'
const l11 = 'Hans ∨ Peter ∨ Otto'
const l12 = 'Hans ∨ (Tet(peter) ∧ Tet(c)) ∨ Otto'
const l13 = '⊥'
const l14 = 'Lulu(a,b,c)'
const l15 = '¬Peter'
const l16 = '⊥'
const l17 = 'today → tomorrow'
const l18 = 'today '
const l19 = 'tomorrow '
const l20 = '(today → tomorrow) → dayaftertomorrow '
const l21 = 'dayaftertomorrow '
const l22 = '(bubu) ↔ cat '
const l23 = 'cat'
const l24 = 'bubu'
const l25 = 'Lulu(a,b,c)'
const l26 = 'Lulu(a,b,c)'
const l27 = 'Lulu(a,b,c) = cat'
const l28 = 'Parse(cat,Lulu(a,b,c))'
const l29 = 'Parse(cat,cat)'
const l30 = 'b = b'
const l31 = 'b = a'
const l32 = 'a=b'
const l33 = '∀x∀t(Zuhause(x, t) → ¬AmTatort(x, t))'
const l34 = '∀t(Zuhause(Peter, t) → ¬AmTatort(Peter,t))'
const l35 = 'Tet(a) ∧ W(b, S(a)) ∧ a = a'
const l36 = '∃x(Tet(x) ∧ W(b,S(x)) ∧ x = x)'

//const tokens = new Scanner(l5,3).scanTokens()
//console.log(tokens)
//console.log(1 + tokens[0])

const line1 = parseLine(l1)
const line2 = parseLine(l2)
const line3 = parseLine(l3)
const line4 = parseLine(l4)
const line5 = parseLine(l5)
const line6 = parseLine(l6)
const line7 = parseLine(l7)
const line8 = parseLine(l8)
const line9 = parseLine(l9)
const line10 = parseLine(l10)
const line11 = parseLine(l11)
const line12 = parseLine(l12)
const line13 = parseLine(l13)
const line14 = parseLine(l14)
const line15 = parseLine(l15)
const line16 = parseLine(l16)
const line17 = parseLine(l17)
const line18 = parseLine(l18)
const line19 = parseLine(l19)
const line20 = parseLine(l20)
const line21 = parseLine(l21)
const line22 = parseLine(l22)
const line23 = parseLine(l23)
const line24 = parseLine(l24)
const line25 = parseLine(l25)
const line26 = parseLine(l26)
const line27 = parseLine(l27)
const line28 = parseLine(l28)
const line29 = parseLine(l29)
const line30 = parseLine(l30)
const line31 = parseLine(l31)
const line32 = parseLine(l32)
const line33 = parseLine(l33)
const line34 = parseLine(l34)
const line35 = parseLine(l35)
const line36 = parseLine(l36)

console.log( justifyLine(line6, new RuleAndElim(line3) ))
console.log( justifyLine(line6, new RuleAndElim(line2) ))
console.log( !justifyLine(line6, new RuleAndElim(line4) ))
console.log( justifyLine(line8, new RuleAndIntro(line6,line7) ))
console.log(line8.isJustified)
console.log( justifyLine(line10, new RuleNegationElim(line9)))
console.log( justifyLine(line11, new RuleOrIntro(line10)))
console.log( justifyLine(line12, new RuleOrIntro(line8)))
console.log( justifyLine(line14, new RuleBottomElim(line13)))
console.log( justifyLine(line16, new RuleBottomIntro(line15,line10)))
console.log( justifyLine(line16, new RuleBottomIntro(line15,line9)))
console.log( justifyLine(line19, new RuleImplicationElim(line18,line17)))
console.log( justifyLine(line21, new RuleImplicationElim(line17,line20)))
console.log( justifyLine(line24, new RuleBiImplicationElim(line22,line23)))
console.log( justifyLine(line26, new RuleReiteration(line25)))
console.log( justifyLine(line29, new RuleIdentityElim(line28,line27)))
console.log( justifyLine(line32, new RuleIdentityElim(line31,line30)))
console.log( justifyLine(line34, new RuleUniversalElim(line33)))
console.log( justifyLine(line36, new RuleExistentialIntro(line35)))


//const line3  = new Parser(new Scanner(l3,3).scanTokens()).parse();
//const andElim = new AndElim(1,2)
//form.addRule(andElim)
//console.log(line3)

//const $ = document.querySelector.bind(document);
//const $$ = document.querySelectorAll.bind(document);
//let sy = '∀Hello or ⊥ and bye() → 12.6'
//console.log( new Scanner(sy,1).scanTokens())
//console.log(String(new Token(TokenType.LESS_EQUAL,'<=')) + 'test')
//console.log(new Token(TokenType.LESS_EQUAL,'<=').lexeme)

//new Scanner('').keywords.forEach((k,v)=>console.log(k,v))
}
