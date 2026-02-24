export type LeadSource =
  | "Website"
  | "LinkedIn"
  | "Referral"
  | "Event"
  | "Cold Call"
  | string

export type PipelineStage =
  | "Lead"
  | "Qualification"
  | "Discovery"
  | "Proposal Sent"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost"

export interface Deal {
  id: string
  createdDate: Date
  firstName: string
  lastName: string
  email: string
  company: string
  industry: string
  companySize: string
  country: string
  leadSource: LeadSource
  status: string
  owner: string
  dealValue: number
  pipelineStage: PipelineStage
  lastContactDate: Date
  nextFollowupDate: Date
  tags: string[]
}
