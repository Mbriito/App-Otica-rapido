import { EyewearFrame } from '../types';

import squareAcetateImg from '../assets/images/square_acetate_eyeglasses_1795637104268.jpg';
import squareTitaniumImg from '../assets/images/square_titanium_eyeglasses_1795637104229.jpg';
import squareOversizedSunImg from '../assets/images/square_oversized_sunglasses_1795637105782.jpg';
import squareFlattopSunImg from '../assets/images/square_flattop_sunglasses_1795637106624.jpg';

import ovalTitaniumImg from '../assets/images/oval_titanium_eyeglasses_1795637106558.jpg';
import ovalAcetateImg from '../assets/images/oval_acetate_eyeglasses_1795637107468.jpg';
import ovalRetroSunImg from '../assets/images/oval_retro_sunglasses_1795637108215.jpg';
import ovalMetalSunImg from '../assets/images/oval_metal_sunglasses_1795637108564.jpg';

import cateyeAcetateImg from '../assets/images/cateye_acetate_eyeglasses_1795637109389.jpg';
import cateyeMetalImg from '../assets/images/cateye_metal_eyeglasses_1795637109311.jpg';
import cateyeGlamourSunImg from '../assets/images/cateye_glamour_sunglasses_1795637110620.jpg';
import cateyeModernSunImg from '../assets/images/cateye_modern_sunglasses_1795637111767.jpg';

import roundTitaniumImg from '../assets/images/round_titanium_eyeglasses_1795637112288.jpg';
import roundMetalSunImg from '../assets/images/round_metal_sunglasses_1795637112907.jpg';

import rectangularExecutiveImg from '../assets/images/rectangular_executive_eyeglasses_1795637114309.jpg';

import aviatorGoldSunImg from '../assets/images/aviator_gold_sunglasses_1795637115340.jpg';
import aviatorTitaniumImg from '../assets/images/aviator_titanium_eyeglasses_1795637168942.jpg';

import hexagonalMetalImg from '../assets/images/hexagonal_metal_eyeglasses_1795637167326.jpg';
import octagonalMetalSunImg from '../assets/images/octagonal_metal_sunglasses_1795637167923.jpg';

export const MIN_FRAME_PRICE = 120;

export const premiumFrames: EyewearFrame[] = [
  // 1. MODELOS QUADRADOS (GRAU E SOL)
  {
    id: 'ref-quadrado-grau-bold',
    referenceCode: 'REF-QD01',
    name: 'Modelo Referência • Quadrado Bold',
    brand: 'Referência Ótica Rapido',
    price: 189.9,
    category: 'grau',
    gender: 'unissex',
    shape: 'quadrado',
    material: 'acetato',
    imageUrl: squareAcetateImg,
    colors: ['Preto Clássico', 'Tartaruga Âmbar', 'Cristal Translúcido', 'Cinza Fumê'],
    description: 'Armação quadrada em acetato maciço com linhas bem definidas. Um dos formatos mais requisitados, trazendo presença, elegância e versatilidade.',
    faceRecommendation: 'Ideal para rostos redondos, ovais e triangulares',
    rating: 4.9
  },
  {
    id: 'ref-quadrado-grau-slim',
    referenceCode: 'REF-QD02',
    name: 'Modelo Referência • Quadrado Slim Minimal',
    brand: 'Referência Ótica Rapido',
    price: 269.9,
    category: 'grau',
    gender: 'unissex',
    shape: 'quadrado',
    material: 'titanio',
    imageUrl: squareTitaniumImg,
    colors: ['Ouro Escovado', 'Prata Grafite', 'Preto Fosco'],
    description: 'Estrutura quadrada em metal ultra fino. Leveza absoluta para quem busca discrição, conforto diário prolongado e sofisticação.',
    faceRecommendation: 'Perfeito para rostos redondos e ovais',
    rating: 4.8
  },
  {
    id: 'ref-quadrado-sol-oversized',
    referenceCode: 'REF-QD03',
    name: 'Modelo Referência • Quadrado Solar Oversized',
    brand: 'Referência Ótica Rapido',
    price: 249.9,
    category: 'sol',
    gender: 'unissex',
    shape: 'quadrado',
    material: 'acetato',
    imageUrl: squareOversizedSunImg,
    colors: ['Preto com Lente G15', 'Tartaruga Havana com Lente Marrom', 'Verde Militar'],
    description: 'Óculos de sol quadrado de porte marcante com lentes amplas e proteção UV400. Design urbano moderno com alta cobertura visual contra luminosidade.',
    faceRecommendation: 'Excelente para rostos ovais e arredondados',
    rating: 4.9
  },
  {
    id: 'ref-quadrado-sol-flattop',
    referenceCode: 'REF-QD04',
    name: 'Modelo Referência • Quadrado Flat-Top Solar',
    brand: 'Referência Ótica Rapido',
    price: 279.9,
    category: 'sol',
    gender: 'unissex',
    shape: 'quadrado',
    material: 'acetato',
    imageUrl: squareFlattopSunImg,
    colors: ['Preto Total', 'Fumê Degradê', 'Marrom Café'],
    description: 'Linha superior reta e hastes largas contemporâneas. Estilo moderno de alta proteção solar contra reflexos e raios solares intensos.',
    faceRecommendation: 'Valoriza rostos ovais, redondos e coração',
    rating: 4.8
  },

  // 2. MODELOS OVAIS (GRAU E SOL)
  {
    id: 'ref-oval-grau-titanio',
    referenceCode: 'REF-OV01',
    name: 'Modelo Referência • Oval Vintage Titanium',
    brand: 'Referência Ótica Rapido',
    price: 289.9,
    category: 'grau',
    gender: 'unissex',
    shape: 'oval',
    material: 'titanio',
    imageUrl: ovalTitaniumImg,
    colors: ['Dourado Champagne', 'Ouro Rose', 'Prata Polida', 'Preto Matte'],
    description: 'Formato oval suave em titânio flexível e super leve. Harmonia estética limpa que suaviza traços marcantes e equilibra o rosto.',
    faceRecommendation: 'Ideal para rostos quadrados, retangulares e diamante',
    rating: 4.9
  },
  {
    id: 'ref-oval-grau-acetato',
    referenceCode: 'REF-OV02',
    name: 'Modelo Referência • Oval Soft Acetato',
    brand: 'Referência Ótica Rapido',
    price: 159.9,
    category: 'grau',
    gender: 'feminino',
    shape: 'oval',
    material: 'acetato',
    imageUrl: ovalAcetateImg,
    colors: ['Bordô Translúcido', 'Tartaruga Mel', 'Nude Cristal', 'Preto Brilho'],
    description: 'Curvas ovais fluidas em acetato refinado. Proporciona um visual acolhedor, intelectual e moderno com excelente ergonomia no nariz.',
    faceRecommendation: 'Harmoniza perfeitamente com rostos quadrados e angulares',
    rating: 4.8
  },
  {
    id: 'ref-oval-sol-y2k',
    referenceCode: 'REF-OV03',
    name: 'Modelo Referência • Oval Solar Retrô',
    brand: 'Referência Ótica Rapido',
    price: 199.9,
    category: 'sol',
    gender: 'unissex',
    shape: 'oval',
    material: 'acetato',
    imageUrl: ovalRetroSunImg,
    colors: ['Preto com Lente Preta', 'Tartaruga Vintage', 'Branco Off-White', 'Caramelo'],
    description: 'Tendência consagrada com formato oval alongado. Estilo atemporal com lentes escuras de alta definição e bloqueio UVA/UVB.',
    faceRecommendation: 'Ideal para rostos angulares, quadrados e longos',
    rating: 4.9
  },
  {
    id: 'ref-oval-sol-metal',
    referenceCode: 'REF-OV04',
    name: 'Modelo Referência • Oval Solar Minimal Metal',
    brand: 'Referência Ótica Rapido',
    price: 149.9,
    category: 'sol',
    gender: 'unissex',
    shape: 'oval',
    material: 'metal',
    imageUrl: ovalMetalSunImg,
    colors: ['Dourado com Lente Verde', 'Prata com Lente Azul Degradê', 'Preto Total'],
    description: 'Design slim com aro metálico trabalhado e lentes solares curvas. Um visual despojado e contemporâneo.',
    faceRecommendation: 'Adapta-se com facilidade a todos os formatos de rosto',
    rating: 4.7
  },

  // 3. MODELOS DE GATINHA / CAT-EYE (GRAU E SOL)
  {
    id: 'ref-gatinho-grau-classic',
    referenceCode: 'REF-GT01',
    name: 'Modelo Referência • Gatinho Clássico Up-Lift',
    brand: 'Referência Ótica Rapido',
    price: 179.9,
    category: 'grau',
    gender: 'feminino',
    shape: 'gatinho',
    material: 'acetato',
    imageUrl: cateyeAcetateImg,
    colors: ['Preto Elegance', 'Vermelho Rubi', 'Tartaruga Clássica', 'Transparente Rose'],
    description: 'O formato clássico de gatinha com cantos superiores elevados que levantam a expressão do olhar e valorizam a maquiagem e sobrancelhas.',
    faceRecommendation: 'Excelente para rostos ovais, redondos, quadrados e coração',
    rating: 5.0
  },
  {
    id: 'ref-gatinho-grau-metal',
    referenceCode: 'REF-GT02',
    name: 'Modelo Referência • Gatinho Delicado em Metal',
    brand: 'Referência Ótica Rapido',
    price: 120.0,
    category: 'grau',
    gender: 'feminino',
    shape: 'gatinho',
    material: 'metal',
    imageUrl: cateyeMetalImg,
    colors: ['Ouro Rosé', 'Dourado com Pontas Pretas', 'Prata Fina'],
    description: 'Armação leve em metal nobre com silhueta cat-eye geométrica e sutil. Toque jovial, feminino e confortável para o dia a dia.',
    faceRecommendation: 'Indicado para rostos redondos, ovais e triangulares',
    rating: 4.8
  },
  {
    id: 'ref-gatinho-sol-glamour',
    referenceCode: 'REF-GT03',
    name: 'Modelo Referência • Gatinho Glamour Solar',
    brand: 'Referência Ótica Rapido',
    price: 259.9,
    category: 'sol',
    gender: 'feminino',
    shape: 'gatinho',
    material: 'acetato',
    imageUrl: cateyeGlamourSunImg,
    colors: ['Preto Ônix', 'Tartaruga Dourada', 'Bordô Degradê', 'Branco Pérola'],
    description: 'Óculos solar gatinho imponente com curvatura acentuada e acabamento polido espelhado. Máxima sofisticação para dias ensolarados.',
    faceRecommendation: 'Combina com rostos ovais, redondos e formato coração',
    rating: 4.9
  },
  {
    id: 'ref-gatinho-sol-modern',
    referenceCode: 'REF-GT04',
    name: 'Modelo Referência • Gatinho Geométrico Solar',
    brand: 'Referência Ótica Rapido',
    price: 229.9,
    category: 'sol',
    gender: 'feminino',
    shape: 'gatinho',
    material: 'acetato',
    imageUrl: cateyeModernSunImg,
    colors: ['Preto com Detalhe Dourado', 'Tartaruga Havana', 'Cristal Fumê'],
    description: 'Versão contemporânea da gatinha com ângulos retos e lentes polarizadas de proteção total UV400.',
    faceRecommendation: 'Perfeito para rostos redondos e ovais',
    rating: 4.8
  },

  // 4. MODELOS REDONDOS (GRAU E SOL)
  {
    id: 'ref-redondo-grau-intellectual',
    referenceCode: 'REF-RD01',
    name: 'Modelo Referência • Redondo Intelectual',
    brand: 'Referência Ótica Rapido',
    price: 279.9,
    category: 'grau',
    gender: 'unissex',
    shape: 'redondo',
    material: 'titanio',
    imageUrl: roundTitaniumImg,
    colors: ['Ouro Envelhecido', 'Prata Nobre', 'Preto Matte', 'Cobre'],
    description: 'Design circular clássico e atemporal. Proporciona um ar erudito, criativo e sofisticado com encaixe anatômico perfeito.',
    faceRecommendation: 'Harmoniza com rostos quadrados, retangulares e triangulares',
    rating: 4.9
  },
  {
    id: 'ref-redondo-sol-boho',
    referenceCode: 'REF-RD02',
    name: 'Modelo Referência • Redondo Solar Bohemian',
    brand: 'Referência Ótica Rapido',
    price: 169.9,
    category: 'sol',
    gender: 'unissex',
    shape: 'redondo',
    material: 'metal',
    imageUrl: roundMetalSunImg,
    colors: ['Dourado com Lente G15 Verde', 'Prata com Lente Prata Espelhada', 'Preto Fosco'],
    description: 'Lentes circulares icônicas com proteção ultravioleta. Estilo vintage que nunca sai de moda.',
    faceRecommendation: 'Ideal para rostos quadrados e retangulares',
    rating: 4.8
  },

  // 5. MODELOS RETANGULARES (GRAU E SOL)
  {
    id: 'ref-retangular-grau-executivo',
    referenceCode: 'REF-RT01',
    name: 'Modelo Referência • Retangular Executivo',
    brand: 'Referência Ótica Rapido',
    price: 139.9,
    category: 'grau',
    gender: 'unissex',
    shape: 'retangular',
    material: 'acetato',
    imageUrl: rectangularExecutiveImg,
    colors: ['Preto Fosco', 'Azul Marinho Escuro', 'Grafite Translúcido'],
    description: 'Linhas retas e estrutura compacta, muito recomendada para ambientes corporativos, leitura e foco prolongado.',
    faceRecommendation: 'Ideal para rostos redondos, ovais e cheios',
    rating: 4.8
  },

  // 6. MODELOS AVIADOR (SOL E GRAU)
  {
    id: 'ref-aviador-sol-heritage',
    referenceCode: 'REF-AV01',
    name: 'Modelo Referência • Aviador Clássico Solar',
    brand: 'Referência Ótica Rapido',
    price: 219.9,
    category: 'sol',
    gender: 'unissex',
    shape: 'aviador',
    material: 'metal',
    imageUrl: aviatorGoldSunImg,
    colors: ['Dourado com Lente Verde G15', 'Prata com Lente Cinza Degradê', 'Preto Polarizado'],
    description: 'A silhueta com ponte dupla mais famosa da óptica mundial. Lentes com proteção UV400 e campo visual panorâmico.',
    faceRecommendation: 'Excelente para rostos ovais, quadrados e coração',
    rating: 4.9
  },
  {
    id: 'ref-aviador-grau-modern',
    referenceCode: 'REF-AV02',
    name: 'Modelo Referência • Aviador Urbano para Grau',
    brand: 'Referência Ótica Rapido',
    price: 299.9,
    category: 'grau',
    gender: 'unissex',
    shape: 'aviador',
    material: 'titanio',
    imageUrl: aviatorTitaniumImg,
    colors: ['Dourado Fino', 'Prata Titânio', 'Preto Acetinado'],
    description: 'Armação aviador adaptada para lentes oftálmicas de grau com ponte anatômica e peso imperceptível no rosto.',
    faceRecommendation: 'Ideal para rostos ovais e triangulares',
    rating: 4.7
  },

  // 7. MODELOS GEOMÉTRICOS / HEXAGONAIS
  {
    id: 'ref-geometrico-grau-hexagon',
    referenceCode: 'REF-GM01',
    name: 'Modelo Referência • Hexagonal Geométrico',
    brand: 'Referência Ótica Rapido',
    price: 129.9,
    category: 'grau',
    gender: 'unissex',
    shape: 'geometrico',
    material: 'metal',
    imageUrl: hexagonalMetalImg,
    colors: ['Dourado Escovado', 'Cobre Vintage', 'Prata Brilhante'],
    description: 'Geometria multifacetada que combina a suavidade do redondo com a atitude do quadrado. Visual inovador e super moderno.',
    faceRecommendation: 'Harmoniza com quase todos os tipos de rosto',
    rating: 4.9
  },
  {
    id: 'ref-geometrico-sol-polygon',
    referenceCode: 'REF-GM02',
    name: 'Modelo Referência • Geométrico Solar Octógono',
    brand: 'Referência Ótica Rapido',
    price: 239.9,
    category: 'sol',
    gender: 'unissex',
    shape: 'geometrico',
    material: 'metal',
    imageUrl: octagonalMetalSunImg,
    colors: ['Dourado com Lente Marrom', 'Preto com Lente Escura', 'Prata com Espelhado'],
    description: 'Design de ângulos facetados para quem procura originalidade, proteção solar e identidade estética marcante.',
    faceRecommendation: 'Excelente para rostos ovais e redondos',
    rating: 4.8
  }
];
