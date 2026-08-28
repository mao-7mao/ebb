/**
 * External Links & Backend Integration Configuration
 * 
 * You can modify the links below in VS Code.
 * Changes will take effect across the Instrument Reservation and Chemical Inventory modules.
 */

export interface CabinetConfig {
  id: string;
  name: string;
  shortName: string;
  gid: string;
  description: string;
  badgeColor?: string;
}

export const EXTERNAL_LINKS = {
  // Google Apps Script endpoint for Instrument Reservation
  instrumentReservationScriptUrl: "https://script.google.com/macros/s/AKfycbwA4Z3wVMCMni_Uf0sMI4PsGXIETXuvZdf9_e_se-c5cY0T9PFXYH1ppphJgnhcAvRcHQ/exec",

  // Google Spreadsheet URL for Chemical & Reagent Inventory (Default: A Cabinet)
  chemicalInventorySheetUrl: "https://docs.google.com/spreadsheets/d/1fR4pSvZ5sKq6cqzNJPqa9zGyx7Nt14ez/edit?gid=1566311014#gid=1566311014",
  
  // Specific spreadsheet ID
  chemicalSpreadsheetId: "1fR4pSvZ5sKq6cqzNJPqa9zGyx7Nt14ez",

  // All Chemical Cabinets (A, B, C, D, E & Gas Cylinders)
  chemicalCabinets: [
    { 
      id: "A", 
      name: "A 櫃 (Cabinet A)", 
      shortName: "A 櫃", 
      gid: "1566311014", 
      description: "標準化學試劑與有機化合物 / Standard Reagents & Organics",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200"
    },
    { 
      id: "B", 
      name: "B 櫃 (Cabinet B)", 
      shortName: "B 櫃", 
      gid: "416350249", 
      description: "無機鹽類、界面活性劑與生化試劑 / Inorganic Salts & Surfactants",
      badgeColor: "bg-blue-50 text-blue-800 border-blue-200"
    },
    { 
      id: "C", 
      name: "C 櫃 (Cabinet C)", 
      shortName: "C 櫃", 
      gid: "1766991683", 
      description: "高分子聚合物、有機溶劑與固體材料 / Polymers, Solvents & Materials",
      badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200"
    },
    { 
      id: "D", 
      name: "D 櫃 (Cabinet D - Toxic 毒化物)", 
      shortName: "D 櫃 毒化物", 
      gid: "1368391809", 
      description: "環保署列管毒性化學物質 / Regulated Toxic Chemicals",
      badgeColor: "bg-amber-100 text-amber-900 border-amber-300 font-bold"
    },
    { 
      id: "E", 
      name: "E 櫃 (Cabinet E - Ionic Liquids)", 
      shortName: "E 櫃", 
      gid: "817227161", 
      description: "離子液體與特用化學品 / Ionic Liquids & Specialty Reagents",
      badgeColor: "bg-purple-50 text-purple-800 border-purple-200"
    },
    { 
      id: "Gas", 
      name: "氣體鋼瓶 (Gas Cylinders)", 
      shortName: "氣體鋼瓶", 
      gid: "1158465073", 
      description: "實驗室氣體鋼瓶存量與位置 / Lab Gas Cylinders Stock & Location",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300"
    }
  ] as CabinetConfig[]
};

