// -- test
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

testParser()

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
