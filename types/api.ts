export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLoginAt?: string | null;
  isSuperAdmin?: boolean;
  /** Null until the onboarding wizard is finished (Day 68). */
  onboardingCompletedAt?: string | null;
  onboardingStep?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type OrganizationRole = "Owner" | "Admin" | "Member" | number;
export type OrganizationPlan = "Free" | "Starter" | "Professional" | "Enterprise" | number;
export type InvitationStatus = "Pending" | "Accepted" | "Expired" | "Revoked" | number;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  ownerId: string;
  settings: string;
  currentUserRole?: OrganizationRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: OrganizationRole;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: OrganizationRole;
  token: string;
  status: InvitationStatus;
  invitedByUserId: string;
  invitedByName?: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface InvitationPublic {
  token: string;
  organizationName: string;
  email: string;
  role: OrganizationRole;
  status: InvitationStatus;
  expiresAt: string;
  isExpired: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: string[];
}

export type DocumentType = "Rfp" | "Proposal" | "Template" | "Other" | number;
export type DocumentStatus = "Uploaded" | "Processing" | "Ready" | "Failed" | number;

export interface DocumentItem {
  id: string;
  organizationId: string;
  name: string;
  type: DocumentType;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  uploadedByUserId: string;
  uploadedByName: string;
  metadata: string;
  wordCount?: number | null;
  pageCount?: number | null;
  description?: string | null;
  chunkCount: number;
  extractedTextPreview?: string | null;
  extractedTextTotalChars?: number | null;
  hasEmbeddings: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PresignedUrlResponse {
  url: string;
  expiresAt: string;
}

export interface DocumentSearchResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  similarityScore: number;
}

export interface DocumentSearchResponse {
  query: string;
  results: DocumentSearchResult[];
}

export type RfpAnalysisStatus = "Pending" | "Processing" | "Completed" | "Failed" | number;
export type ComplianceStatus = "NotReviewed" | "Compliant" | "Partial" | "NonCompliant" | number;

export interface RfpRequirement {
  id: string;
  description: string;
  section: string;
  category: string;
  isMandatory: boolean;
}

export interface RfpDeadline {
  name: string;
  date?: string | null;
  time?: string | null;
  notes?: string | null;
}

export interface EvaluationCriterion {
  criterion: string;
  weightPercent: number;
  description?: string | null;
}

export interface ComplianceMatrixRow {
  reqId: string;
  description: string;
  section: string;
  isMandatory: boolean;
  complianceStatus: ComplianceStatus;
  ourResponse?: string | null;
  notes?: string | null;
}

export interface BudgetRange {
  min?: number | null;
  max?: number | null;
  currency: string;
  notes?: string | null;
}

export interface RfpAnalysis {
  id: string;
  organizationId: string;
  documentId: string;
  documentName: string;
  title: string;
  status: RfpAnalysisStatus;
  requirements: RfpRequirement[];
  deadlines: RfpDeadline[];
  evaluationCriteria: EvaluationCriterion[];
  complianceMatrix: ComplianceMatrixRow[];
  aiSummary?: string | null;
  issuingOrganization?: string | null;
  contractDuration?: string | null;
  budgetRange?: BudgetRange | null;
  processingTimeSeconds?: number | null;
  aiModelUsed?: string | null;
  errorMessage?: string | null;
  compliancePercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface RfpAnalysisSummary {
  id: string;
  documentId: string;
  documentName: string;
  title: string;
  status: RfpAnalysisStatus;
  mandatoryRequirementCount: number;
  optionalRequirementCount: number;
  compliancePercent: number;
  createdAt: string;
}

export interface RfpAnalysisListResponse {
  items: RfpAnalysisSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export type ProposalStatus = "Draft" | "InReview" | "Approved" | "Submitted" | "Archived" | number;

export interface ProposalSection {
  id: string;
  proposalId: string;
  title: string;
  orderIndex: number;
  content: string;
  aiGenerated: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;
  organizationId: string;
  rfpAnalysisId?: string | null;
  rfpAnalysisTitle?: string | null;
  templateDocumentId?: string | null;
  title: string;
  status: ProposalStatus;
  createdByUserId: string;
  lastEditedByUserId?: string | null;
  submittedAt?: string | null;
  sectionCount: number;
  totalWordCount: number;
  createdAt: string;
  updatedAt: string;
  sections: ProposalSection[];
}

export interface ProposalListResponse {
  items: Proposal[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ChatSource {
  documentName: string;
  chunkContent: string;
}

export type CommentStatus = "Open" | "Resolved" | number;

export interface Comment {
  id: string;
  proposalId: string;
  sectionId: string;
  anchorText: string;
  commentText: string;
  userId: string;
  userName: string;
  parentCommentId?: string | null;
  status: CommentStatus;
  createdAt: string;
  replies: Comment[];
}

export interface ProposalVersionSummary {
  id: string;
  versionNumber: number;
  changeSummary: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export interface ProposalVersionDetail extends ProposalVersionSummary {
  sections: ProposalSection[];
}

export type SharePermission = "View" | "Comment" | "Edit" | number;

export interface ProposalShare {
  id: string;
  proposalId: string;
  sharedWithEmail: string;
  permission: SharePermission;
  shareToken: string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface SharedProposal {
  title: string;
  organizationName: string;
  sharedByName: string;
  permission: SharePermission;
  sections: ProposalSection[];
}

export interface ComplianceCheckRequirementResult {
  reqId: string;
  description: string;
  score: number;
  rationale: string;
  isMandatory: boolean;
}

export interface ComplianceCheckResult {
  overallScore: number;
  requirements: ComplianceCheckRequirementResult[];
}

export interface DashboardStats {
  proposalsCount: { total: number; thisMonth: number; byStatus: Record<string, number> };
  rfpAnalysesCount: { total: number; thisMonth: number };
  documentsCount: { total: number; totalSizeMb: number };
  teamMembersCount: number;
  recentProposals: { id: string; title: string; status: string; updatedAt: string }[];
  recentAnalyses: { id: string; title: string; compliancePercent: number; createdAt: string }[];
}


// ---- Day 51: notification preferences ----

export type NotificationType =
  | "ProposalShared"
  | "CommentAdded"
  | "RfpAnalysisComplete"
  | "TeamInvite";

export interface NotificationPreference {
  notificationType: NotificationType;
  emailEnabled: boolean;
}

// ---- Day 52: activity feed ----

export type ActivityEntityType = "Proposal" | "RfpAnalysis" | "Document" | "Team";
export type ActivityAction =
  | "Created"
  | "Updated"
  | "Deleted"
  | "Shared"
  | "Exported"
  | "Commented"
  | "StatusChanged"
  | "Analyzed"
  | "Uploaded"
  | "PlanChanged";

export interface ActivityLogItem {
  id: string;
  userId: string;
  userName: string;
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle: string;
  action: ActivityAction;
  metadata: string;
  createdAt: string;
}

export interface ActivityListResponse {
  items: ActivityLogItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// ---- Days 56-60: billing ----

export type SubscriptionStatus = "None" | "Active" | "Trialing" | "PastDue" | "Canceled";

export interface SubscriptionPlanInfo {
  id: string;
  tier: OrganizationPlan;
  name: string;
  priceMonthly: number;
  /** -1 means unlimited. */
  maxProposals: number;
  maxRfpAnalyses: number;
  maxTeamMembers: number;
  storageGb: number;
  features: string[];
  purchasable: boolean;
}

export interface UsageMeter {
  used: number;
  /** -1 means unlimited. */
  limit: number;
}

export interface Subscription {
  plan: SubscriptionPlanInfo;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeCustomer: boolean;
  usage: {
    proposals: UsageMeter;
    rfpAnalyses: UsageMeter;
    teamMembers: UsageMeter;
  };
  paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null;
}

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  status: "Paid" | "Failed" | "Upcoming" | "Void";
  pdfUrl: string | null;
}

// ---- Days 61-63: admin panel ----

export interface AdminStats {
  totalOrgs: number;
  totalUsers: number;
  mrrUsd: number;
  newSignupsToday: number;
  newSignupsWeek: number;
}

export interface AdminOrganization {
  id: string;
  name: string;
  ownerEmail: string;
  plan: OrganizationPlan;
  subscriptionStatus: SubscriptionStatus | number;
  userCount: number;
  proposalCount: number;
  monthlyRevenue: number;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string | null;
  isSuspended: boolean;
  isSuperAdmin: boolean;
}

export interface AdminPaged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ImpersonationResult {
  token: string;
  user: User;
  organizationId: string | null;
  expiresAt: string;
}

export interface AiCosts {
  thisMonthTotal: number;
  byFeature: { feature: string | number; totalCost: number; callCount: number }[];
  byOrg: { organizationId: string; orgName: string; totalCost: number }[];
  dailyCosts: { date: string; costUsd: number }[];
  alertThresholdUsd: number;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string;
  company: string | null;
  useCase: string | null;
  invitedAt: string | null;
  joinedAt: string | null;
  createdAt: string;
}