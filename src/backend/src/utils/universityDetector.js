/**
 * Map of email domains to university names
 */
const UNIVERSITY_MAP = {
  // CEU universities
  'ceu.es': 'Universidad CEU',
  'uchceu.es': 'Universidad CEU Cardenal Herrera',
  'usp.ceu.es': 'Universidad CEU San Pablo',
  
  // Madrid universities
  'ucm.es': 'Universidad Complutense de Madrid',
  'upm.es': 'Universidad Politécnica de Madrid',
  'uam.es': 'Universidad Autónoma de Madrid',
  'uc3m.es': 'Universidad Carlos III de Madrid',
  'urjc.es': 'Universidad Rey Juan Carlos',
  
  // Andalusia universities
  'ugr.es': 'Universidad de Granada',
  'us.es': 'Universidad de Sevilla',
  'uma.es': 'Universidad de Málaga',
  'uca.es': 'Universidad de Cádiz',
  'upo.es': 'Universidad Pablo de Olavide',
  'ual.es': 'Universidad de Almería',
  'uhu.es': 'Universidad de Huelva',
  'ujaen.es': 'Universidad de Jaén',
  'uco.es': 'Universidad de Córdoba',
  
  // Catalonia universities
  'uab.cat': 'Universitat Autònoma de Barcelona',
  'ub.edu': 'Universitat de Barcelona',
  'uoc.edu': 'Universitat Oberta de Catalunya',
  'upc.edu': 'Universitat Politècnica de Catalunya',
  'upf.edu': 'Universitat Pompeu Fabra',
  'udl.cat': 'Universitat de Lleida',
  'udg.edu': 'Universitat de Girona',
  'urv.cat': 'Universitat Rovira i Virgili',
  
  // Basque Country & Navarre
  'ehu.eus': 'Universidad del País Vasco',
  'deusto.es': 'Universidad de Deusto',
  'unav.es': 'Universidad de Navarra',
  'upna.es': 'Universidad Pública de Navarra',
  
  // Rest of Spain
  'unizar.es': 'Universidad de Zaragoza',
  'uva.es': 'Universidad de Valladolid',
  'uclm.es': 'Universidad de Castilla-La Mancha',
  'uniovi.es': 'Universidad de Oviedo',
  'unileon.es': 'Universidad de León',
  'unican.es': 'Universidad de Cantabria',
  'uib.es': 'Universidad de las Islas Baleares',
  'ulpgc.es': 'Universidad de Las Palmas de Gran Canaria',
  'ull.es': 'Universidad de La Laguna',
  'um.es': 'Universidad de Murcia',
  'upct.es': 'Universidad Politécnica de Cartagena',
  'uex.es': 'Universidad de Extremadura',
  'udc.es': 'Universidade da Coruña',
  'uvigo.es': 'Universidad de Vigo',
  'usc.es': 'Universidad de Santiago de Compostela',
  'uv.es': 'Universidad de Valencia',
  'ua.es': 'Universidad de Alicante',
  'uji.es': 'Universitat Jaume I',
  'umh.es': 'Universidad Miguel Hernández',
};

/**
 * Detect university name from email domain
 * Checks the main domain and all subdomains
 * 
 * @param {string} email - User email address
 * @returns {string|null} - University name or null if not found
 */
export function getUniversityFromEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const domain = email.split('@')[1];
  if (!domain) {
    return null;
  }

  // Check exact match first
  if (UNIVERSITY_MAP[domain]) {
    return UNIVERSITY_MAP[domain];
  }

  // Check if it's a subdomain of any known domain
  for (const [universityDomain, universityName] of Object.entries(UNIVERSITY_MAP)) {
    if (domain.endsWith('.' + universityDomain) || domain === universityDomain) {
      return universityName;
    }
  }

  return null;
}
