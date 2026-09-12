import { SEVERITIES, STATES } from './types.js';
const text={type:'string'};
const evidence={type:'object',required:['scanId','url','observed','explanation'],properties:{scanId:text,previousScanId:text,url:text,observed:{},previous:{},explanation:text},additionalProperties:false};
const properties={schemaVersion:{const:1},ruleId:text,ruleVersion:text,packId:text,packVersion:text,status:{enum:STATES},severity:{enum:SEVERITIES},confidence:{enum:['HIGH','MEDIUM','LOW']},confidenceReason:text,applicability:{enum:['applicable','not_applicable','uncertain']},title:text,explanation:text,resource:text,evidence:{type:'array',minItems:1,items:evidence}};
export const resultSchema={$schema:'https://json-schema.org/draft/2020-12/schema',$id:'urn:watchlayer:rule-result:1',type:'object',required:Object.keys(properties),properties,additionalProperties:false};
const findingProperties={...properties,findingId:text,firstDetected:{type:'string',format:'date-time'},currentState:{enum:STATES},description:text,recommendation:text,priority:{type:'integer',minimum:0}};
export const findingSchema={$schema:'https://json-schema.org/draft/2020-12/schema',$id:'urn:watchlayer:finding:1',type:'object',required:Object.keys(findingProperties),properties:findingProperties,additionalProperties:false};
