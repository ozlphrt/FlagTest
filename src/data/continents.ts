// Minimal continent mapping infrastructure.
// Fill `CONTINENT_BY_ISO2` with ISO2 -> 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania'.
// For now, it returns 'Unknown' when not mapped; callers should fallback (e.g., hash bucketing).

export type Continent = 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania' | 'Unknown';

// Complete ISO alpha-2 → Continent map (UN members)
const CONTINENT_BY_ISO2: Record<string, Continent> = {
  // Africa (54)
  'dz':'Africa','ao':'Africa','bj':'Africa','bw':'Africa','bf':'Africa','bi':'Africa','cm':'Africa','cv':'Africa','cf':'Africa','td':'Africa','km':'Africa','cg':'Africa','cd':'Africa','ci':'Africa','dj':'Africa','eg':'Africa','gq':'Africa','er':'Africa','sz':'Africa','et':'Africa','ga':'Africa','gm':'Africa','gh':'Africa','gn':'Africa','gw':'Africa','ke':'Africa','ls':'Africa','lr':'Africa','ly':'Africa','mg':'Africa','mw':'Africa','ml':'Africa','mr':'Africa','mu':'Africa','yt':'Africa','ma':'Africa','mz':'Africa','na':'Africa','ne':'Africa','ng':'Africa','re':'Africa','rw':'Africa','sh':'Africa','st':'Africa','sn':'Africa','sc':'Africa','sl':'Africa','so':'Africa','za':'Africa','ss':'Africa','sd':'Africa','tz':'Africa','tg':'Africa','tn':'Africa','ug':'Africa','eh':'Africa','zm':'Africa','zw':'Africa',
  // Americas (35)
  'ag':'Americas','ar':'Americas','bs':'Americas','bb':'Americas','bz':'Americas','bo':'Americas','br':'Americas','ca':'Americas','cl':'Americas','co':'Americas','cr':'Americas','cu':'Americas','dm':'Americas','do':'Americas','ec':'Americas','sv':'Americas','gd':'Americas','gt':'Americas','gy':'Americas','ht':'Americas','hn':'Americas','jm':'Americas','mx':'Americas','ni':'Americas','pa':'Americas','py':'Americas','pe':'Americas','kn':'Americas','lc':'Americas','vc':'Americas','sr':'Americas','tt':'Americas','us':'Americas','uy':'Americas','ve':'Americas',
  // Asia (47)
  'af':'Asia','am':'Asia','az':'Asia','bh':'Asia','bd':'Asia','bt':'Asia','bn':'Asia','kh':'Asia','cn':'Asia','ge':'Asia','in':'Asia','id':'Asia','ir':'Asia','iq':'Asia','il':'Asia','jp':'Asia','jo':'Asia','kz':'Asia','kw':'Asia','kg':'Asia','la':'Asia','lb':'Asia','my':'Asia','mv':'Asia','mn':'Asia','mm':'Asia','np':'Asia','kp':'Asia','om':'Asia','pk':'Asia','ps':'Asia','qa':'Asia','sa':'Asia','sg':'Asia','kr':'Asia','lk':'Asia','sy':'Asia','tw':'Asia','tj':'Asia','th':'Asia','tl':'Asia','tr':'Asia','tm':'Asia','ae':'Asia','uz':'Asia','vn':'Asia','ye':'Asia','ph':'Asia',
  // Europe (43)
  'al':'Europe','ad':'Europe','at':'Europe','by':'Europe','be':'Europe','ba':'Europe','bg':'Europe','hr':'Europe','cy':'Europe','cz':'Europe','dk':'Europe','ee':'Europe','fi':'Europe','fr':'Europe','de':'Europe','gr':'Europe','hu':'Europe','is':'Europe','ie':'Europe','it':'Europe','kz':'Europe','xk':'Europe','lv':'Europe','li':'Europe','lt':'Europe','lu':'Europe','mt':'Europe','md':'Europe','mc':'Europe','me':'Europe','nl':'Europe','mk':'Europe','no':'Europe','pl':'Europe','pt':'Europe','ro':'Europe','ru':'Europe','sm':'Europe','rs':'Europe','sk':'Europe','si':'Europe','es':'Europe','se':'Europe','ch':'Europe','ua':'Europe','gb':'Europe','va':'Europe',
  // Oceania (14)
  'au':'Oceania','fj':'Oceania','ki':'Oceania','mh':'Oceania','fm':'Oceania','nr':'Oceania','nz':'Oceania','pw':'Oceania','pg':'Oceania','ws':'Oceania','sb':'Oceania','to':'Oceania','tv':'Oceania','vu':'Oceania'
};

export function continentOf(iso2: string): Continent {
	const c = CONTINENT_BY_ISO2[iso2.toLowerCase()];
	return c ?? 'Unknown';
}

