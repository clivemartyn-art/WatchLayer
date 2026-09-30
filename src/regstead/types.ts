import type {Result} from '../rules/types.js';
export type JobState='QUEUED'|'RUNNING'|'AWAITING_REVIEW'|'APPROVED'|'RELEASED'|'FAILED'|'CANCELLED';
export type JobType='BASELINE'|'MONITORING'|'MANUAL_RECHECK';
export type FailureCode='NETWORK_TRANSIENT'|'ROBOTS_BLOCKED'|'BROWSER_POLICY_BLOCKED'|'ENGINE_FAILURE'|'REPORT_GENERATION_FAILURE'|'STORAGE_FAILURE'|'EMAIL_FAILURE'|'STRIPE_WEBHOOK_FAILURE'|'INVALID_CONFIGURATION';
export class OperationalError extends Error {constructor(public code:FailureCode,public transient=false){super(code);}}
export interface Organisation {id:string;legalName:string;displayName:string;contactName:string;contactEmail:string;notes:string;status:'LEAD'|'ACTIVE'|'INACTIVE';createdAt:number;updatedAt:number;lastClaimAt?:number}
export interface Site {id:string;organisationId:string;canonicalUrl:string;hostname:string;active:boolean;paused:boolean;pack:'lawwatch-england-wales';packConfirmedAt?:number;packConfirmedBy?:string;sectorApplicability?:'ESTABLISHED'|'NOT_ESTABLISHED';browserFallback:boolean;createdAt:number;updatedAt:number;nextRunAt:number;lastSuccessfulRunAt?:number;cadenceMs:number}
export interface Subscription {id:string;organisationId:string;provider:'stripe';stripeCustomerId:string;stripeSubscriptionId:string;stripePriceId:string;status:string;currentPeriodEnd:number;cancelAtPeriodEnd:boolean;createdAt:number;updatedAt:number;graceDeadline?:number;lastEventCreated:number}
export interface Versions {engineVersion:string;packVersion:string;browserPolicyVersion:string;release:string}
export interface Job extends Versions {id:string;key:string;organisationId:string;siteId:string;type:JobType;status:JobState;scheduledAt:number;startedAt?:number;completedAt?:number;failureCode?:FailureCode;retryCount:number;leaseUntil?:number;token?:string;runId?:string;manualAuthorisation?:string}
export interface EngineResult {scanId:string;reference:string;sourceProfile:string;comparisonBaseline:string|null;metrics:Record<string,number>;results:Result[];changes:Result[];startedAt:string;completedAt:string;versions:Versions}
export interface Run extends EngineResult {id:string;jobId:string;createdAt:number}
export interface Review {id:string;reportId:string;findingId:string;status:'APPROVED'|'SUPPRESSED'|'ANNOTATED';reviewer:string;reviewedAt:number;note:string;title?:string;explanation?:string}
export interface Finding {id:string;raw:Result;title:string;explanation:string}
export interface Report {id:string;jobId:string;scanRunId:string;organisationId:string;siteId:string;version:number;status:'DRAFT'|'RELEASED';findings:Finding[];createdAt:number;releasedAt?:number;artifact?:string;hash?:string;reviewHash?:string;customerVersion?:1;customerSummary?:Record<string,number>}
export type Template='ONBOARDING'|'BASELINE_READY'|'MONITORING_READY'|'MATERIAL_REVIEW'|'PAYMENT_FAILURE'|'CANCELLATION';
export interface Notification {id:string;key:string;organisationId:string;reportId?:string;template:Template;status:'QUEUED'|'SENDING'|'SENT'|'FAILED';attempts:number;attemptedAt?:number;providerReference?:string;leaseUntil?:number;token?:string;failureCode?:FailureCode}
export interface Checkout {id:string;organisationId:string;priceId:string;termsVersion:string;acceptedAt:number;createdAt:number;sessionId?:string;url?:string;subscriptionId?:string}
export interface Webhook {id:string;type:string;created:number;subscriptionId?:string;checkoutId?:string;status:'QUEUED'|'PROCESSING'|'PROCESSED'|'IGNORED'|'FAILED';attempts:number;leaseUntil?:number;token?:string;failureCode?:FailureCode}
export interface Audit {id:string;event:string;at:number;organisationId?:string;siteId?:string;jobId?:string;scanRunId?:string;reportId?:string;actor?:string;code?:string}
export interface PortalUser {id:string;organisationId:string;email:string;displayName:string;role:'OWNER';status:'ACTIVE'|'DISABLED';approvedPilot:boolean;createdAt:number;updatedAt:number}
export interface PortalLink {id:string;userId:string;hash:string;createdAt:number;expiresAt:number;usedAt?:number;delivery:'PENDING'|'ACCEPTED'|'FAILED';providerReference?:string}
export interface PortalSession {id:string;userId:string;hash:string;csrfHash:string;createdAt:number;expiresAt:number}
export interface PortalRate {id:string;count:number;expiresAt:number}
export interface PortalForm {id:string;expiresAt:number}
export interface OperatorUser {id:string;email:string;displayName:string;role:'ADMIN';status:'ACTIVE'|'DISABLED';createdAt:number;updatedAt:number}
export interface OperatorLink {id:string;userId:string;hash:string;createdAt:number;expiresAt:number;usedAt?:number;delivery:'PENDING'|'ACCEPTED'|'FAILED';providerReference?:string}
export interface OperatorSession {id:string;userId:string;hash:string;csrfHash:string;createdAt:number;expiresAt:number}
export interface EmailDelivery {id:string;hash:string;startedAt:number;status:"PENDING"|"ACCEPTED"|"FAILED";reference?:string;leaseUntil?:number}
export interface Data {operatorUsers:OperatorUser[];operatorLinks:OperatorLink[];operatorSessions:OperatorSession[];emailDeliveries:EmailDelivery[];portalUsers:PortalUser[];portalLinks:PortalLink[];portalSessions:PortalSession[];portalRates:PortalRate[];portalForms:PortalForm[];organisations:Organisation[];sites:Site[];subscriptions:Subscription[];jobs:Job[];runs:Run[];reports:Report[];reviews:Review[];notifications:Notification[];checkouts:Checkout[];webhooks:Webhook[];audit:Audit[];heartbeats:Record<string,number>}
export const emptyData=():Data=>({operatorUsers:[],operatorLinks:[],operatorSessions:[],emailDeliveries:[],portalUsers:[],portalLinks:[],portalSessions:[],portalRates:[],portalForms:[],organisations:[],sites:[],subscriptions:[],jobs:[],runs:[],reports:[],reviews:[],notifications:[],checkouts:[],webhooks:[],audit:[],heartbeats:{}});
export interface Repository {read():Promise<Data>;transaction<T>(mutate:(data:Data)=>T):Promise<T>;close():Promise<void>}
export interface Engine {run(job:Job,site:Site):Promise<EngineResult>}
export interface ArtifactStore {put(key:string,body:Buffer):Promise<string>;get(key:string):Promise<Buffer>}
export interface EmailProvider {send(key:string,message:{to:string;subject:string;text:string}):Promise<string>}
