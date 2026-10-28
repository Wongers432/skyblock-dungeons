import type { Song } from '../score';
import { hub } from './hub';
import { depth1 } from './depth1';
import { depth2 } from './depth2';
import { depth3 } from './depth3';
import { depth4 } from './depth4';
import { depth5 } from './depth5';
import { depth6 } from './depth6';
import { depth7 } from './depth7';

/** Every track in the soundtrack, by the key the game asks for. */
export const TRACKS = { hub, depth1, depth2, depth3, depth4, depth5, depth6, depth7 } satisfies Record<string, Song>;
export type TrackKey = keyof typeof TRACKS;
