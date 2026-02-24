import Papa from "papaparse"
import type { Deal, PipelineStage } from "@/types/deal"

type RawRow = Record<string, string>

function parseDate(value: string): Date {
  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date() : d
}

function parseTags(value: string): string[] {
  if (!value) return []
  return value.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
}

function mapRow(row: RawRow, index: number): Deal {
  return {
    id: row["id"] || row["ID"] || row["Lead_ID"] || row["lead_id"] || String(index),
    createdDate: parseDate(row["createdDate"] || row["Created Date"] || row["created_date"] || row["Created_Date"] || ""),
    firstName: row["firstName"] || row["First Name"] || row["first_name"] || row["First_Name"] || "",
    lastName: row["lastName"] || row["Last Name"] || row["last_name"] || row["Last_Name"] || "",
    email: row["email"] || row["Email"] || "",
    company: row["company"] || row["Company"] || "",
    industry: row["industry"] || row["Industry"] || "",
    companySize: row["companySize"] || row["Company Size"] || row["company_size"] || row["Company_Size"] || "",
    country: row["country"] || row["Country"] || "",
    leadSource: row["leadSource"] || row["Lead Source"] || row["lead_source"] || row["Lead_Source"] || "",
    status: row["status"] || row["Status"] || "",
    owner: row["owner"] || row["Owner"] || "",
    dealValue: parseFloat(row["dealValue"] || row["Deal Value"] || row["deal_value"] || row["Deal_Value"] || "0") || 0,
    pipelineStage: (row["pipelineStage"] || row["Pipeline Stage"] || row["pipeline_stage"] || row["Pipeline_Stage"] || "Lead") as PipelineStage,
    lastContactDate: parseDate(row["lastContactDate"] || row["Last Contact Date"] || row["last_contact_date"] || row["Last_Contact_Date"] || ""),
    nextFollowupDate: parseDate(row["nextFollowupDate"] || row["Next Followup Date"] || row["next_followup_date"] || row["Next_Followup_Date"] || ""),
    tags: parseTags(row["tags"] || row["Tags"] || ""),
  }
}

export function parseCsvFile(file: File): Promise<Deal[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: "",
      complete: (results) => {
        try {
          const deals = results.data.map((row, i) => mapRow(row, i))
          resolve(deals)
        } catch (err) {
          reject(err)
        }
      },
      error: (err) => reject(err),
    })
  })
}
