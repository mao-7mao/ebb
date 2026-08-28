export interface ResearchTopic {
  title_zh: string;
  title_en: string;
  keywords: string[];
}

export interface Member {
  id: string;
  name_zh: string;
  name_en: string;
  role: string;
  role_en?: string; // English role for the English business card!
  research_topic: ResearchTopic;
  description: string;
}

export interface Meeting {
  id: string;
  date: string;
  archive_group: string;
  title: string;
  speaker: string;
  speaker_id: string;
  status: string;
  status_label: string;
  search: string;
}

export const members: Member[] = [
  {
    "id": "fanny",
    "name_zh": "林郁芳",
    "name_en": "Fanny",
    "role": "114博班",
    "role_en": "Ph.D. Student",
    "research_topic": { 
      "title_zh": "農業創新覆蓋膜", 
      "title_en": "Innovative Agricultural Mulch Films",
      "keywords": ["生物質", "液體地膜"] 
    },
    "description": "研發創新的液態生物質地膜技術，旨在提升農作效益並減少傳統塑膠地膜污染。 / Devoted to developing innovative liquid biomass mulch film technology, aiming to enhance agricultural efficiency and mitigate conventional plastic film pollution."
  },
  {
    "id": "kalin",
    "name_zh": "陳采翎",
    "name_en": "Kalin",
    "role": "114碩班",
    "role_en": "Master's Student",
    "research_topic": { 
      "title_zh": "新一代生物基聚酯材料", 
      "title_en": "Next-Generation Bio-Based Polyester Materials",
      "keywords": ["PEF", "生物基聚酯"] 
    },
    "description": "專注於開發具有高阻隔性能的新一代生物基聚酯材料（PEF），探索其製程優化與未來應用。 / Focusing on the development of next-generation bio-based polyester materials (PEF) with high-barrier properties, exploring process optimization and prospective applications."
  },
  {
    "id": "kevin",
    "name_zh": "游家御",
    "name_en": "Kevin",
    "role": "114碩班",
    "role_en": "Master's Student",
    "research_topic": { 
      "title_zh": "永續海岸工程材料", 
      "title_en": "Sustainable Coastal Engineering Materials",
      "keywords": ["農業剩餘物", "貝殼廢棄物", "低碳材料"] 
    },
    "description": "研究利用高鈣貝殼廢棄物與農業生物質，調配無水泥之綠色低碳膠結材料，應用於海岸線生態修複。 / Researching the utilization of high-calcium shell waste and agricultural biomass to formulate cement-free green low-carbon binder materials for coastline ecological restoration."
  },
  {
    "id": "eko",
    "name_zh": "唐瑜陽",
    "name_en": "Eko",
    "role": "113碩班",
    "role_en": "Master's Student",
    "research_topic": { 
      "title_zh": "藻類生質塑膠與異味控制", 
      "title_en": "Algae-Based Bioplastics & Swine Farm Odor Control",
      "keywords": ["藻類", "生質塑膠", "異味處理"] 
    },
    "description": "探索利用藻類生物質來製造環保塑膠的可能性，以及養豬場異味除臭與減碳之環境控制技術。 / Exploring the feasibility of utilizing algal biomass for eco-friendly bioplastics, alongside odor control and carbon mitigation systems for swine farm environments."
  },
  {
    "id": "martin",
    "name_zh": "陳泯熏",
    "name_en": "Martin",
    "role": "115碩班",
    "role_en": "Master's Student",
    "research_topic": { 
      "title_zh": "商業化環保製品與量產", 
      "title_en": "Commercialization and Mass Production of Eco-Friendly Products",
      "keywords": ["種子名片", "油塑膠"] 
    },
    "description": "負責優化生質材料的商品化製程，包含可降解種子名片的量產工藝以及生質油塑膠的配方開發。 / Responsible for optimizing the commercialization process of bio-based materials, including the mass production craft of biodegradable seed name cards and formulation development of bio-oil plastics."
  },
  {
    "id": "peter",
    "name_zh": "花翊軒",
    "name_en": "Peter",
    "role": "115碩班",
    "role_en": "Master's Student",
    "research_topic": { 
      "title_zh": "永續海岸工程材料", 
      "title_en": "Sustainable Coastal Engineering Materials",
      "keywords": ["農業剩餘物", "貝殼廢棄物", "低碳材料"] 
    },
    "description": "協同進行低碳海岸材料之長期耐鹽霧與力學強度測試，評估其結構耐久性等。 / Collaborating on long-term salt spray resistance and mechanical strength testing of low-carbon coastal materials to evaluate structural durability in extreme offshore environments."
  },
  {
    "id": "nina",
    "name_zh": "陳采蘋",
    "name_en": "Nina",
    "role": "115碩班",
    "role_en": "Master's Student",
    "research_topic": { 
      "title_zh": "植物纖維快速複合材料", 
      "title_en": "Plant Fiber Rapid Composite Materials",
      "keywords": ["竹材液化", "複合材料", "Bamboo Liquefaction"] 
    },
    "description": "專注於竹材的快速高溫化學液化技術，製作高附加價值的生質建材。 / Concentrating on the rapid high-temperature chemical liquefaction technology of bamboo to manufacture high-value-added bio-based building materials."
  },
  {
    "id": "chris",
    "name_zh": "黃科錡",
    "name_en": "Chris",
    "role": "114碩班",
    "role_en": "Master's Student",
    "research_topic": {
      "title_zh": "VOC 生物處理技術",
      "title_en": "VOC Biological Treatment Technology",
      "keywords": ["生物滌慮塔", "氣體淨化", "揮發性有機物"]
    },
    "description": "利用生物滌慮塔技術，達成高效揮發性有機物（VOCs）之降解與氣體淨化。 / Utilizing biotrickling filter tower technology to achieve high-efficiency biodegradation and purification of volatile organic compounds (VOCs)."
  },
  {
    "id": "tina",
    "name_zh": "吳羿葶",
    "name_en": "Tina",
    "role": "113碩班",
    "role_en": "Master's Student",
    "research_topic": {
      "title_zh": "綠色複合與生質材料",
      "title_en": "Green Composites & Bio-Materials",
      "keywords": ["木質素回收", "低共熔溶劑", "Lignin Recovery"]
    },
    "description": "研究自低共熔溶劑中萃取回收木質素，並開發高阻隔與高強度的綠色生質複合材料。 / Studying the recovery of lignin from deep eutectic solvents via extraction and developing high-barrier, high-strength green bio-composites."
  },
  {
    "id": "sonali",
    "name_zh": "Sonali Mazumdar",
    "name_en": "Sonali",
    "role": "交換學生",
    "role_en": "Doctoral Exchange Student",
    "research_topic": {
      "title_zh": "農業創新地膜",
      "title_en": "Innovative Agricultural Mulch Films",
      "keywords": ["生物質", "農業地膜", "Biomass"]
    },
    "description": "專注於農業創新地膜技術研發與生質覆蓋材料之應用。 / Devoted to the research and development of innovative agricultural mulch films and sustainable bio-based applications."
  },
  {
    "id": "safira",
    "name_zh": "Safira Prameshwari Ananta Haryanto",
    "name_en": "Safira",
    "role": "交換學生",
    "role_en": "Exchange Student",
    "research_topic": {
      "title_zh": "新一代生物基聚酯材料",
      "title_en": "Next-Generation Bio-Based Polyester Materials",
      "keywords": ["PEF", "生物基聚酯"]
    },
    "description": "Focusing on the development of next-generation bio-based polyester materials (PEF) with high-barrier properties, exploring process optimization and prospective applications."
  }
];

export const meetings: Meeting[] = [
  {
    "id": "m_1785724881358",
    "date": "2026/07/23",
    "archive_group": "JULY 2026",
    "title": "Incorporation of Poly(ethylene 2,5-furanoate) into Poly(butylene adipate-co-terephthalate)toward Sustainable Food Packaging Films with Enhanced Strength and Barrier Properties",
    "speaker": "Kalin",
    "speaker_id": "kalin",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Incorporation of Poly(ethylene 2,5-furanoate) into Poly(butylene adipate-co-terephthalate)toward Sustainable Food Packaging Films with Enhanced Strength and Barrier Properties Kalin 2026/07/23 JULY 2026"
  },
  {
    "id": "m_1785724881358",
    "date": "2026/07/23",
    "archive_group": "JULY 2026",
    "title": "3D printing of edible hydrogels containing thiamine and their comparison\nto cast gels",
    "speaker": "Eko",
    "speaker_id": "eko",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "3D printing of edible hydrogels containing thiamine and their comparison\nto cast gels Eko 2026/07/23 JULY 2026"
  },
  {
    "id": "m1",
    "date": "2026/06/18",
    "archive_group": "JUNE 2026",
    "title": "Recovery of lignin from deep eutectic solvents by liquid-liquid extraction",
    "speaker": "Tina",
    "speaker_id": "tina",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Recovery lignin deep eutectic solvents liquid-liquid extraction Tina"
  },
  {
    "id": "m2",
    "date": "2026/06/18",
    "archive_group": "JUNE 2026",
    "title": "How Can Odors Be Measured? An Overview of Methods and Their Applications",
    "speaker": "Eko",
    "speaker_id": "eko",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Odors  Eko"
  },
  {
    "id": "m3",
    "date": "2026/06/18",
    "archive_group": "JUNE 2026",
    "title": "Compatibilization of Polylactide/Poly(ethylene 2,5-furanoate) (PLA/PEF) Blends for Sustainable and Bioderived Packaging",
    "speaker": "Kalin",
    "speaker_id": "kalin",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Compatibilization PLA PEF Sustainable Bioderived Packaging Kalin"
  },
  {
    "id": "m4",
    "date": "2026/06/04",
    "archive_group": "JUNE 2026",
    "title": "Study on engineering and thermal properties of environment-friendly lightweight brick made from Kinmen oyster shells & sorghum waste",
    "speaker": "Kevin",
    "speaker_id": "kevin",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Study engineering thermal properties environment-friendly lightweight brick Kinmen oyster shells sorghum waste Kevin"
  },
  {
    "id": "m5",
    "date": "2026/06/04",
    "archive_group": "JUNE 2026",
    "title": "Scale-Up Preparation of Biobased Poly(ethylene furanoate) Biaxial Orientation Films with Enhanced Mechanical and Barrier Properties for Packaging",
    "speaker": "Fanny",
    "speaker_id": "fanny",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Scale-Up Preparation Biobased Poly(ethylene furanoate) Biaxial Orientation Films Enhanced Mechanical Barrier Properties Packaging Fanny"
  },
  {
    "id": "m6",
    "date": "2026/06/04",
    "archive_group": "JUNE 2026",
    "title": "Collaborative Removal of NOx and Toluene in Flue Gas Driven by Aerobic Denitrifying Biotrickling Filter",
    "speaker": "Chris",
    "speaker_id": "chris",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Collaborative Removal NOx Toluene Flue Gas Aerobic Denitrifying Biotrickling Filter Chris"
  },
  {
    "id": "m7",
    "date": "2026/04/30",
    "archive_group": "APRIL 2026",
    "title": "Insights into the Synthesis of Poly(ethylene 2,5-Furandicarboxylate) from 2,5-Furandicarboxylic Acid: Steps toward Environmental and Food Safety Excellence in Packaging Applications",
    "speaker": "Kalin",
    "speaker_id": "kalin",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Polymer Matrix Scaling Material kalin"
  },
  {
    "id": "m8",
    "date": "2026/04/30",
    "archive_group": "APRIL 2026",
    "title": "A sustainable solution to plastics pollution: An eco-friendly bioplastic film production from high-salt contained Spirulina sp. residues",
    "speaker": "Eko",
    "speaker_id": "eko",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "high-salt contained Spirulina sp. residues eko"
  },
  {
    "id": "m9",
    "date": "2026/04/16",
    "archive_group": "APRIL 2026",
    "title": "Catalytic Synthesis of Lactic Acid from Cellulose over Easily-prepared Niobium-doped Titania by Solution Combustion Synthesis",
    "speaker": "Kevin",
    "speaker_id": "kevin",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Lactic Acid kevin"
  },
  {
    "id": "m10",
    "date": "2026/04/16",
    "archive_group": "APRIL 2026",
    "title": "Valorization of Spruce Bark to Environmentally Sustainable Packaging Materials",
    "speaker": "Fanny",
    "speaker_id": "fanny",
    "status": "completed",
    "status_label": "✓ Completed",
    "search": "Sustainable Packaging Materials fanny"
  }
];
