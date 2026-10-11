// @ts-check
/**
 * The logo mark: a worker honeybee in flight, seen from the side, facing right, toward the light
 * and toward the wordmark in the lockup. Real anatomy, never a cartoon: a slim banded abdomen about
 * twice the length of the thorax, a small fuzzy thorax of warm hair (a smooth round orange thorax
 * reads as a hornet), a head that is mostly compound eye, an elbowed antenna, jointed legs with a
 * pollen load, and a raised pair of forewings over a smaller hindwing.
 *
 * One light, low from the upper right: it lights the wings' leading edges, the hair on top of the
 * thorax, the top of each abdomen band and the front of the eye. A cool moonlit rim of deep teal
 * runs under the abdomen, the head and the lower legs. It keeps the silhouette whole on the
 * near-black grounds, where a dark band would otherwise punch a hole in the outline (bark on Hive
 * is 1.43:1), and it is dark enough to draw that edge on Beeswax too. For the same reason a dark
 * pixel on the outline is umber or tawny, never bark or wine; those stay inside.
 *
 * No outline: the bee sits on Hive, Propolis, Comb black, Dusk and Beeswax alike. On Dusk the far
 * forewing's and the hindwing's membranes take the ground's own color, so only their veins and
 * edges show: they read as see-through, which is intended. Both sprites are placed by hand; the
 * 16 px cut is drawn for its size, never scaled down from the 32 px one.
 *
 * There is one bee in the brand: art that shows it elsewhere, such as the hero, should derive it
 * from mark() by remapping colors for its own light, not draw a second bee. Its anatomy in mark()
 * coordinates: abdomen columns 1 to 15, thorax 16 to 21, head 22 to 26, the compound eye in
 * columns 23 to 25 (rows 13 to 18), the antenna's elbow at (29, 9), the pollen load at columns
 * 11 to 13 (rows 22 to 24). The wings are exactly the cool-colored pixels on rows 0 to 12; every
 * cool pixel below them is the eye's sheen or the rim.
 */
import { sprite } from "../lib/sprite.js";
import { C } from "../palette.js";

/** One character per palette color, the keys of the brand's palette sheet. */
const LEGEND = {
  0: C["comb-black"], // compound eye
  3: C.bark, // dark band shade
  4: C.umber, // head capsule, thorax shade and outline, dark band tops on the outline
  5: C.tawny, // pale hair flecks on the thorax, lit head and legs, antenna
  a: C["burnt-comb"], // the gold-brown band in shade, the waist of the 16 px cut
  b: C.amber, // thorax hair in shade, band undersides, the gold-brown band, mandible, pollen in shade
  c: C.marmalade, // thorax hair in half shade, gold bands in half shade, pollen in shade
  d: C.honey, // gold bands, lit thorax hair
  e: C.gold, // tops of the gold bands, hair tufts, pollen
  f: C.pollen, // the brightest tuft, speculars
  k: C.wine, // cores of the dark bands
  o: C.dusk, // far forewing and hindwing membrane
  p: C.slate, // near forewing cells, veins of the far wing
  q: C["deep-teal"], // veins, wing edges, the moonlit rim, the eye's sheen
  r: C.sky, // tip of the far forewing
  s: C.mist, // costa (leading edge) of the near forewing
  t: C.glint, // the eye's glint, the stigma's glint
};

/**
 * 32 × 32. The near forewing rises over the back at 45° (its costa an even 1:1 stair, a radius
 * vein beside it, two cross veins), the far forewing stands steeper behind it at 2:1, dimmer, its
 * vein an even 2:1 stair too, and the gap between their tips keeps the pair readable as a V even in
 * silhouette. The hindwing is a smaller dusk lobe under the forewing's trailing edge.
 *
 * The thorax is hair, not shell: honey and gold where the light falls, a ragged terminator (a lock
 * of lit hair hangs into the shade) into marmalade and amber, pale tawny hairs flecked through the
 * shade, and umber only on its lowest outline and the coxae, which keeps it a brown honeybee
 * thorax rather than an orange ball. Abdomen bands from the waist back: gold, dark, gold, dark,
 * gold, dark, a gold-brown band, then the dark tip. Each band is shaded only a little top to
 * bottom, so the stripes stay stronger than the form shading and read at 1x.
 *
 * The compound eye is a kidney three pixels wide, with a notch on its front margin where the
 * antenna sockets sit and no pupil: its only light is a cool sheen and a glint at the top front,
 * facing the sun. The head capsule rings it on every side (umber behind, tawny and umber in front
 * and above), so at 1x it reads as an eye rather than as a dark gap between thorax and head. Legs:
 * femur, tibia and tarsus at even steps, spread apart so they never merge, tawny where lit and
 * deep teal where the rim catches the tarsi. The hind and middle femurs are two pixels thick at
 * the hip and taper to one, and the pollen load hangs a row clear of the belly.
 */
const MARK = `
  ................................
  ...............rr...............
  ........qss....pr...............
  .......qppqs...poq..............
  .......qpppqs..poq..............
  .......qppppqt.popq.............
  ........qppqpqsoopq.............
  .........qqpppqsoopq............
  ......qqqoqppppqsopq............
  .......qqooqppqpqsopq........5..
  .........qqooqpppqspq.......5.5.
  ...........qqooqppqspq......5.4.
  .............qqqpqqe.f.455.5...4
  .................cddee440q55....
  ..........eef5..5ddeed400t5.....
  .......e45dde3e.5cdddd40004.....
  .....4ed33dddkd.45cdcc40045.....
  ...553ddkkccdkdd44b5b440004.....
  ..4bbkcckkccckcc.4444..4004.....
  .4kabkcckkbbbkqq.544.5.q44b.....
  ..qqa3bb3kqqqq..54.54.5.q4......
  ....qqqqqq.....54..5...5........
  ............ef5...5....q........
  ...........cde....q.....q.......
  ...........bcd...q..............
  ............5...................
  ............q...................
  ...........q....................
  ................................
  ................................
  ................................
  ................................
`;

/**
 * 16 × 16, the favicon cut: the silhouette, two dark stripes and an amber tip, the wing pair as a
 * V (the far wing upright and dim), a warm thorax, the eye with its cool sheen, a stub of antenna,
 * and the pollen load, which is what says honeybee at this size.
 */
const MARK_SMALL = `
  ................
  ....ss...r......
  ...qpqs..pr.....
  ...qppqs.pq.....
  ....qppqsoq....5
  .....qppqsq...5.
  .......qqse...5.
  ........5de455..
  ...ee5e.5dd0q5..
  .b4ddkdd4cd004..
  .qkcckccab4q4b..
  ..qqqqq.5.5.....
  .....ef5.5......
  .....cd..q......
  .....q..........
  ................
`;

/** The mark, 32 × 32, transparent around the bee. */
export function mark() {
  return sprite(MARK, LEGEND);
}

/** The favicon cut, 16 × 16, transparent around the bee. */
export function markSmall() {
  return sprite(MARK_SMALL, LEGEND);
}
