// Felles data: språk, kilder og malen for våtrom og flis.
// Tekstene ligger i lang/<kode>.js. Norsk (nb) er grunnspråk og reserve.
window.SE = window.SE || {};
SE.T = SE.T || {};

SE.LANGS = [
  { code: 'nb', name: 'Norsk (bokmål)' },
  { code: 'en', name: 'English' },
  { code: 'pl', name: 'Polski' },
  { code: 'ro', name: 'Română' },
  { code: 'lt', name: 'Lietuvių' },
  { code: 'lv', name: 'Latviešu' },
  { code: 'et', name: 'Eesti' }
];

// Kildene er kontrollert 07.11.2026 (Lovdata, DiBK, Byggforskserien).
// Titlene er egennavn og står på norsk i alle språk.
SE.SOURCES = {
  tek:    { title: 'Byggteknisk forskrift (TEK17) § 13-15 Våtrom og rom med vanninstallasjoner', url: 'https://lovdata.no/dokument/SF/forskrift/2017-06-19-840/%C2%A713-15' },
  dibk:   { title: 'Direktoratet for byggkvalitet (DiBK): veiledning til TEK17 § 13-15, preaksepterte ytelser', url: 'https://www.dibk.no/regelverk/byggteknisk-forskrift-tek17/13/vi/13-15' },
  bvn:    { title: 'Byggforskserien (SINTEF): Byggebransjens våtromsnorm (BVN)', url: 'https://byggforsk.no/fagomraade/byggebransjens_vaatromsnorm' },
  hv5:    { title: 'Håndverkertjenesteloven § 5 Utføring og materialer', url: 'https://lovdata.no/dokument/NL/lov/1989-06-16-63/%C2%A75' },
  hv22:   { title: 'Håndverkertjenesteloven § 22 (andre ledd)', url: 'https://lovdata.no/dokument/NL/lov/1989-06-16-63/%C2%A722' },
  pbl203: { title: 'Plan- og bygningsloven § 20-3', url: 'https://lovdata.no/dokument/NL/lov/2008-06-27-71/%C2%A720-3' },
  pbl205: { title: 'Plan- og bygningsloven § 20-5 Tiltak som er unntatt fra søknadsplikt, sjette ledd', url: 'https://lovdata.no/dokument/NL/lov/2008-06-27-71/%C2%A720-5' },
  sak41:  { title: 'Byggesaksforskriften (SAK10) § 4-1 første ledd bokstav e nr. 3', url: 'https://lovdata.no/dokument/SF/forskrift/2010-03-26-488/%C2%A74-1' },
  sak124: { title: 'Byggesaksforskriften (SAK10) § 12-4 bokstav h', url: 'https://lovdata.no/dokument/SF/forskrift/2010-03-26-488/%C2%A712-4' },
  dibk5148: { title: 'DiBK: Samsvarserklæring etter pbl § 23-1 og SAK10 kapittel 12 (blankett 5148)', url: 'https://www.dibk.no/soknad-og-skjema/soknadsskjemaer-for-byggesak/_/attachment/inline/732effaf-fbf6-4097-9ac5-b1f540151b13:2ecbfec34413a1eb8adedca4c44fed60a234c3c3/5148%20Samsvarserkl%C3%A6ring_2019_statisk.pdf' },
  finkn:  { title: 'Finansklagenemnda, avgjørelse FinKN 2025-1286 (17.12.2025)', url: 'https://publisering.finkn.no/api/statements/openPDF/2025-1286' },
  fel12:  { title: 'Forskrift om elektriske lavspenningsanlegg (FEL) § 12', url: 'https://lovdata.no/dokument/SF/forskrift/1998-11-06-1060/%C2%A712' }
};

// Mal: våtrom og flis. Nye fag (tømrer, maler, …) legges til som egne maler
// med samme oppbygging: grupper → arbeidsposter → produkter → erklæringspunkter.
SE.TEMPLATES = {
  vatrom_flis: {
    groups: [
      { id: 'g_prep', items: ['demo', 'frame', 'boards', 'fall'] },
      { id: 'g_wet',  items: ['membrane'] },
      { id: 'g_tile', items: ['tiles', 'grout', 'fixtures'] }
    ],
    // Produktfelt som vises når arbeidsposten er krysset av.
    products: {
      boards:   ['p_boards'],
      membrane: ['p_membrane'],
      tiles:    ['p_adhesive'],
      grout:    ['p_grout', 'p_silicone']
    },
    // Erklæringspunkter. when = arbeidsposter som utløser punktet (tom = alltid).
    declarations: [
      { id: 'd_craft',    ref: 'hvtjl § 5',               src: ['hv5', 'hv22'], when: [] },
      { id: 'd_tek',      ref: 'TEK17 § 13-15',           src: ['tek', 'sak41', 'pbl205'], when: [] },
      { id: 'd_bvn',      ref: 'BVN',                     src: ['bvn'], when: [] },
      { id: 'd_manuf',    ref: '',                        src: [], when: [] },
      { id: 'd_membrane', ref: 'TEK17 § 13-15 (2) d',     src: ['tek', 'dibk'], when: ['membrane'] },
      { id: 'd_fall',     ref: 'TEK17 § 13-15 (2) b',     src: ['tek', 'dibk'], when: ['fall'] },
      { id: 'd_protect',  ref: 'TEK17 § 13-15 (2) d',     src: ['tek'], when: ['tiles', 'grout', 'fixtures', 'boards'] },
      { id: 'd_docs',     ref: '',                        src: [], when: [] },
      { id: 'd_scope',    ref: 'FEL § 12',                src: ['fel12'], when: [] }
    ],
    attachments: ['a_photos', 'a_datasheets', 'a_fdv', 'a_other']
  }
};
