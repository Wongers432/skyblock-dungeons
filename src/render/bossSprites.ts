/**
 * Boss art. Every Warden and Headliner is drawn here at a finer grain than ordinary mobs, so the
 * fights read as set pieces. Bosses that walk get the usual leg-lift frames; robed or rooted ones
 * stand still.
 */
import { defineSprites } from './sprites';

defineSprites({
  // Depth 1. A jester in purple and gold motley: three-pointed belled cap, painted face, ruff.
  pip: [
    '.A............A.', '.MM....AA....YY.', '..MM...YY...YY..', '...MMM.YY.YYY...', '....MMMYYYYY....',
    '....AAAAAAAA....', '....EEEEEEEE....', '....EKEEEEKE....', '....EMEEEEME....', '....EEErrEEE....',
    '....EREEEERE....', '.....ERRRRE.....', '..wEwEwEwEwEwE..', '..MMYYMMYYMMYY..', '..MMYYMMYYMMYY..',
    '..MMMMYYMMYYYY..', '..EEMMYYMMYYEE..', '....AAAAAAAA....', '....MMMMYYYY....', '.....MM..YY.....',
    '.....MM..YY.....', '...AMMM..YYYA...',
  ],
  // Depth 3. A wild-haired alchemist: brass goggles, leather apron, a bubbling green flask.
  grimsby: [
    '...W.WW.W.......', '..WWWWWWWW......', '.WWAAAAAAWW.....', '.WAQQAAQQAW.....', '.WAqQAAqQAW.....',
    '..WssssssW......', '..WsKssKsW......', '..WsssrssW......', '..WWWWWWWW......', '...WWWWWW....v..',
    '....WWWW....QvQ.', '..gglLLLlgg..Qv.', '.ggglLLLlggg.QvQ', '.ggLLLLLLLgg.QQQ', '.gg.LLALLLlgHHH.',
    '.HH.LLLLLL.ggg..', '.HH.LLLLLL......', '....LLLLLL......', '....zz..zz......', '....zz..zz......',
    '....zz..zz......', '...KKK..KKK.....',
  ],
  // Depth 3, phase 3. Grimsby after drinking his own elixir: a hulking green brute in a torn apron.
  grimsby_beast: [
    '.....W.WW.W.......', '....WWWWWWWW......', '...WAQAAAAQAW.....', '...hhhhhhhhhh.....', '...hfhhhhhfhh.....',
    '...hhhhhhhhhh.....', '...hKKhhhhKKh.....', '....hEhEEhEh......', '..hhhhhhhhhhhh....', '.hhhgLLLLLLghhh...',
    'hhhhgLLvLLLghhhh..', 'hhh.gLLLLvLg.hhh..', 'hhh.gLvLLLLg.hhh..', 'hhh.gLLLLLLg.hhh..', 'HHH.LLL.LLLL.HHH..',
    'HHH..gggggg..HHH..', '.....gg..gg.......', '.....gg..gg.......', '.....hh..hh.......', '....HHH..HHH......',
  ],
  // Depth 4. A walking tree-mother: leafy crown in bloom, carved bark face, thorned vine arms, roots.
  bramble: [
    '....gGpGGgFG.....', '...GGdGGGGdGGg...', '..gGFGGdGGGpGGg..', '..GGGGzZZzGGGdG..', '..gdGzZZZZzGGG...',
    '...GzZvZZvZzG....', '....ZZZZZZZZ.....', '....zZzKKzZz.....', '.....ZZZZZZ......', '.d...zZZZZz...d..',
    '.dd.ZZZZZZZZ.dd..', '..dgZZzZZzZZgd...', '...dZZZZZZZZd....', '....ZzZGGZzZ.....', '....ZZZpZZZZ.....',
    '....zZZZZZZz.....', '....ZZzZZzZZ.....', '....ZZZ..ZZZ.....', '....zZZ..ZZz.....', '...zZZz..zZZz....',
    '..z.zz....zz.z...',
  ],
  // Depth 6. A basalt giant of a foreman: hard hat with lamp, magma cracks, hi-vis vest.
  basalt: [
    '......YYYYYY......', '.....YYYJJYYY..TTT', '....YYYYJJYYYY.TTT', '...YYYYYYYYYYYY.l.', '.....9999999....l.',
    '.....9j9999j9...l.', '.....9999+999...l.', '.....99aaaa99...l.', '......9aaaa9....l.', '...99OOOWWOOO99.l.',
    '..999OOOWWOOO999l.', '..99.OOOWWOOO.99l.', '..99.WWWWWWWWW.99.', '..99.OOO9OOOO.99l.', '..aa.OOO9OOOO.aal.',
    '.....tttAtttt.....', '.....BBBBBBBB.....', '.....BBB..BBB.....', '.....BBB..BBB.....', '.....999..999.....',
    '....KKKK..KKKK....',
  ],
  // Depth 6. Basalt's titans: hulking stone with one lens eye and crystal growths. X tints each one.
  titan: [
    '....tTTTTTt....', '...TTTTTTTTT...', '...TTXXXXXTTT..', '...TTXEKEXTTT..', '...TTXXXXXTTT..', '....tTTTTTt....',
    '.XXtTTTTTTTtXX.', 'XXTTTTXXXTTTTXX', 'tTTtTXEXXTtTTTt', 'tTT.TTXXXTT.TTt', 'tTT.TTTTTTT.TTt', 'TTT.tTTTTTt.TTT',
    'ttt..TTTTT..ttt', '.....TTtTT.....', '....TTT.TTT....', '....TTT.TTT....', '....ttt.ttt....', '...TTTT.TTTT...',
  ],
  // Depth 7 Headliners. Boom the Drummer: magenta mohawk, bass drum strapped on, sticks up.
  boom: [
    '.l.....22.....l.', '..l...222....l..', '...s..222...s...', '...s.ssssss.s...', '...s.sKssKs.s...',
    '...3.ssssss.3...', '...3.srrrrs.3...', '...33.ssss.33...', '...3333333333...', '....33333333....',
    '...RARREERRAR...', '...RE2EEEE2ER...', '...REE2EE2EER...', '...REEE22EEER...', '...REE2EE2EER...',
    '...RE2EEEE2ER...', '...RARREERRAR...', '.....NN..NN.....', '.....NN..NN.....', '....KKK..KKK....',
  ],
  // Strobe: a lighting rig made flesh. LED visor, lamp shoulders, electric suit.
  strobe: [
    '.....*.*.*.*.....', '....kkkkkkkkk....', '...kaaaaaaaaak....', '...kDDSDDSDDSk....', '...kaaaaaaaaak....',
    '....kkkkkkkkk....', '......aaaaa......', '..JJ5555555555JJ..', '..JJ55SS5SS55JJ...', '...k55S*S5S*55k...',
    '...k555S5S5555k...', '...a55555S5555a...', '...D.5555555D.D...', '.....kkkkkkk......', '.....55555555.....',
    '.....555..555.....', '.....555..555.....', '.....SSS..SSS.....', '....kkkk..kkkk....',
  ],
  // Riff: a rock guitarist with a gold mane and a gold axe slung across a leather jacket.
  riff: [
    '....AAAAAAA.......', '...AA8AAAAAA......', '..AAAssssssAA.....', '..AAsKssKssAA.....', '..AAsssssssAA.....',
    '..AAAsrrrsAAA.....', '...AA.sss.AA......', '....7777777.......', '...777EEE777......', '..7777EEE7777AA...',
    '..77s7EEE7A88A....', '..77sAAAAA8A......', '..7.AA8AAAA77.....', '...AAAAAA.777.....', '..A8AAA77777......',
    '..AAAA.77777......', '.....NN...NN......', '.....NN...NN......', '.....NN...NN......', '....KKK...KKK.....',
  ],
  // The Maestro: silver-swept hair, red-lined tailcoat, baton raised to cue the finale.
  maestro: [
    '................*.', '....666666.....*E*', '...6666666......*.', '...66ssss66....l..', '...6sKssKs6...l...',
    '....ssssss...l....', '....ssrrss..l.....', '.....ssss..s......', '...00EEEE00s......', '..000ERRE000......',
    '..00RERREE00......', '.000VEEEE000......', '.000VEEEE00s......', '.00.VRRRR00s......', '.00.000000.0......',
    '.0..000000.00.....', '.0..00..00..0.....', '....00..00........', '....00..00........', '...KKK..KKK.......',
  ],
}, true);

// These stand still: robes, gowns and homunculi have no legs to lift.
defineSprites({
  // Depth 2. A bone-crowned necromancer in a deep teal robe, with a skull-topped staff of ghostfire.
  ossia: [
    '...I..I..I.......', '...I.III.I....v..', '...IIIIIII...vDv.', '..oiIiIiIio..vDv.', '.ooIIIIIIIoo..v..',
    '.ouIKKIKKIuo.III.', '.ouIKvIKvIuo.IKI.', '.ouIIIiIIIuo.III.', '.ouIKIKIKIuo..l..', '.oouiIiIiuoo..l..',
    'oouuuIIIuuuoo.l..', 'ouuuuuIuuuuuo.l..', 'ouIuuuuuuuIuuIl..', 'ouIuuuIuuuIuuIl..', 'ouuuuIvIuuuuo.l..',
    'ouuuuuIuuuuuo.l..', 'oouuuIIIuuuoo.l..', 'oouuuuuuuuuoo.l..', 'oouuuuuuuuuoo.l..', 'ooouuuuuuuooo.l..',
    'oIoIouuuoIoIo.l..', '.o.o.ooo.o.o..l..',
  ],
  // Depth 5. A masquerade lady in a faceted gown. X takes each Facet's colour.
  facet: [
    '......E..E..E.....', '......QEQQEQQ.....', '......NNNNNNN.....', '.....NNNNNNNNN....', '.....NXXXXXXXN....',
    '.....NXEKXKEXN....', '.....NXXXXXXXN....', '.....NNssssssN....', '.....NNsssrssNN...', '.....NN.ssss.NN...',
    '......XXXXXXX.....', '.....sXEXXXEXs....', '.....sXXEXEXXs....', '.....s.XXEXX.s....', '.......XXXXX......',
    '......XXEXXXX.....', '.....XXXXXEXXX....', '....XXEXXXXXXXX...', '....XXXXXEXXXEX...', '...XXXEXXXXXXXXX..',
    '...XXXXXXXEXXXXX..', '...EEEEEEEEEEEEE..',
  ],
  // Grimsby's homunculi: round clay-born creatures with one big eye and a stopper on top.
  homunculus: ['....LL....', '...LllL...', '..wwwwww..', '.wwwwwwww.', 'wwwEEEEwww', 'wwwEEKEwww', 'wwwwEEwwww', '.wwwwwwww.', 'w.wwwwww.w', '..ww..ww..'],
  homunculus_r: ['....LL....', '...LllL...', '..tAttAt..', '.TtTTTTtT.', 'AtTEEEETtA', 'TtTEEKETtT', 'AtTTEETTtA', '.TtTTTTtT.', 'T.tAttAt.T', '..tt..tt..'],
  homunculus_c: ['....LL....', '...LvvL...', '..UUUUUU..', '.UvUUUUvU.', 'UUUEEEEUUU', 'UUUEEKEUUU', 'UvUUEEUUvU', '.UUUUUUUU.', 'U.UUUUUU.U', '..UU..UU..'],
  homunculus_l: ['....LL....', '...LQQL...', '..RRRRRR..', '.RRRRRRRR.', 'RRREEEERRR', 'RRREEKERRR', 'RRRREERRRR', '.RRRRRRRR.', 'R.RRRRRR.R', '..RR..RR..'],
  // Pip's second act: the same jester, pedalling a unicycle.
  pip_unicycle: [
    '.A............A.', '.MM....AA....YY.', '..MM...YY...YY..', '...MMM.YY.YYY...', '....MMMYYYYY....',
    '....AAAAAAAA....', '....EEEEEEEE....', '....EKEEEEKE....', '....EMEEEEME....', '....EEErrEEE....',
    '....EREEEERE....', '.....ERRRRE.....', 'E.wEwEwEwEwEw..E', 'MMMMYYMMYYMMYYYY', '....YYMMYYMM....',
    '....MMYYMMYY....', '.....MKKKKY.....', '.....MM..YY.....', '......MTTY......', '.......TT.......',
    '.....KKKKKK.....', '....K..TT..K....', '...K...TT...K...', '...K.TTTTTT.K...', '...K...TT...K...',
    '....K..TT..K....', '.....KKKKKK.....',
  ],
});
