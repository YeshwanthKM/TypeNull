import {
  ApplicationDocumentRequirement,
  PersonalizedChecklistResult,
  ServiceApplicationType,
} from '../types';

export interface EvaluatorInput {
  applicationType: ServiceApplicationType;
  userAnswers: Record<string, any>;
  uploadedDocumentTypes?: string[];
}

/**
 * Reusable Conditional Requirements Evaluator
 * Generates an applicant-tailored document checklist based on situational questions and statutory criteria.
 */
export function evaluateConditionalChecklist(input: EvaluatorInput): PersonalizedChecklistResult {
  const { applicationType, userAnswers, uploadedDocumentTypes = [] } = input;

  const allReqs = applicationType.requirements || [];
  const questions = applicationType.conditionalQuestions || [];

  const mandatoryDocuments: ApplicationDocumentRequirement[] = [];
  const conditionalDocuments: PersonalizedChecklistResult['conditionalDocuments'] = [];
  const alternativeDocumentGroups: PersonalizedChecklistResult['alternativeDocumentGroups'] = [];
  const optionalDocuments: ApplicationDocumentRequirement[] = [];
  const unresolvedRequirements: PersonalizedChecklistResult['unresolvedRequirements'] = [];

  const uploadedSet = new Set(uploadedDocumentTypes.map((t) => t.toLowerCase().trim()));

  for (const req of allReqs) {
    const classification = req.classification || req.requirementClassification || (req.isMandatory ? 'mandatory' : 'optional');

    switch (classification) {
      case 'mandatory': {
        mandatoryDocuments.push(req);
        break;
      }

      case 'conditional': {
        const expr = (req.conditionExpression || '').trim();
        if (!expr) {
          mandatoryDocuments.push(req);
          break;
        }

        // Match key == 'val' or key == true or key == false
        const matchEquality = expr.match(/([a-zA-Z0-9_]+)\s*===?\s*['"]?([^'"]+)['"]?/);
        if (matchEquality) {
          const key = matchEquality[1];
          const expectedValStr = matchEquality[2].trim().toLowerCase();
          const actualVal = userAnswers[key];

          if (actualVal === undefined) {
            unresolvedRequirements.push({
              requirement: req,
              reason: `Unanswered question "${key}" is required to determine applicability.`,
            });
          } else {
            const actualValStr = String(actualVal).trim().toLowerCase();
            const isMatch =
              actualValStr === expectedValStr ||
              (expectedValStr === 'true' && actualVal === true) ||
              (expectedValStr === 'false' && actualVal === false);

            if (isMatch) {
              const questionObj = questions.find((q) => q.questionCode === key || q.questionKey === key);
              const questionText = questionObj?.questionText || key;
              conditionalDocuments.push({
                requirement: req,
                triggeredByQuestion: questionText,
                userAnswer: actualVal,
              });
            }
          }
        } else {
          // Complex or unknown condition
          unresolvedRequirements.push({
            requirement: req,
            reason: `Condition "${expr}" requires manual administrative verification.`,
          });
        }
        break;
      }

      case 'alternative': {
        const altGroup = req.acceptedAlternatives || [];
        const canonicalKey = (req.canonicalDocumentKey || req.documentType || req.documentName || '').toLowerCase();
        const isSatisfied =
          uploadedSet.has(canonicalKey) ||
          altGroup.some((alt) => uploadedSet.has(alt.toLowerCase()));

        alternativeDocumentGroups.push({
          groupName: req.documentName,
          options: [req],
          isSatisfied,
        });
        break;
      }

      case 'optional': {
        optionalDocuments.push(req);
        break;
      }

      default: {
        mandatoryDocuments.push(req);
        break;
      }
    }
  }

  const totalRequiredCount =
    mandatoryDocuments.length +
    conditionalDocuments.length +
    alternativeDocumentGroups.length;

  return {
    applicationTypeId: applicationType.id,
    serviceName: applicationType.applicationName,
    mandatoryDocuments,
    conditionalDocuments,
    alternativeDocumentGroups,
    optionalDocuments,
    unresolvedRequirements,
    totalRequiredCount,
  };
}
