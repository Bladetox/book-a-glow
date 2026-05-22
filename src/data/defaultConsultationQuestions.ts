// Standard fallback consultation questions per business type
// Stage 2: pure data module, no side effects

export type BusinessType =
  | 'waxing'
  | 'skincare'
  | 'hair'
  | 'nails'
  | 'massage'
  | 'lashes'
  | 'brows'
  | 'tattoo'
  | 'piercing'
  | 'wellness'
  | 'general';

export type QuestionType = 'yes_no' | 'text' | 'textarea' | 'radio' | 'checkbox';

export interface ConsultationQuestionDefinition {
  key: string; // stable key for mapping answers
  label: string;
  type: QuestionType;
  required?: boolean;
  options?: string[]; // for radio/checkbox
}

export const defaultConsultationQuestions: Record<BusinessType, ConsultationQuestionDefinition[]> = {
  waxing: [
    {
      key: 'skin_conditions',
      label: 'Do you have any skin conditions (e.g. eczema, psoriasis, dermatitis) in the treatment area?',
      type: 'yes_no',
      required: true,
    },
    {
      key: 'medications',
      label: 'Are you currently using any medications or topical products that may affect your skin (e.g. retinoids, acne medication, blood thinners)?',
      type: 'textarea',
    },
    {
      key: 'allergies',
      label: 'Do you have any allergies (including wax, latex, fragrances, or skincare ingredients)?',
      type: 'textarea',
    },
    {
      key: 'pregnancy',
      label: 'Are you pregnant or breastfeeding?',
      type: 'yes_no',
    },
    {
      key: 'health_conditions',
      label: 'Do you have any health conditions we should be aware of (e.g. diabetes, circulatory issues)?',
      type: 'textarea',
    },
    {
      key: 'environmental_exposure',
      label: 'Have you recently had significant sun exposure, tanning, or used self-tan on the treatment area?',
      type: 'yes_no',
    },
    {
      key: 'physical_factors',
      label: 'Are there any physical factors (cuts, bruises, inflammation) in the treatment area today?',
      type: 'yes_no',
    },
    {
      key: 'hair_length_ok',
      label: 'Is your hair long enough for waxing (at least a few millimetres)?',
      type: 'yes_no',
    },
  ],
  skincare: [
    {
      key: 'skin_type',
      label: 'How would you describe your skin type?',
      type: 'radio',
      options: ['Dry', 'Oily', 'Combination', 'Normal', 'Sensitive', "Not sure"],
      required: true,
    },
    {
      key: 'current_routine',
      label: 'What skincare products are you currently using (morning and night)?',
      type: 'textarea',
    },
    {
      key: 'recent_treatments',
      label: 'Have you had any recent treatments (peels, microneedling, laser, injectables)?',
      type: 'textarea',
    },
    {
      key: 'allergies',
      label: 'Do you have any known allergies or past reactions to skincare products?',
      type: 'textarea',
    },
    {
      key: 'medications',
      label: 'Are you taking any medications that may affect your skin (e.g. Roaccutane / isotretinoin)?',
      type: 'textarea',
    },
    {
      key: 'pregnancy',
      label: 'Are you pregnant or breastfeeding?',
      type: 'yes_no',
    },
  ],
  hair: [
    {
      key: 'scalp_conditions',
      label: 'Do you have any scalp conditions (e.g. psoriasis, dermatitis, infections)?',
      type: 'yes_no',
    },
    {
      key: 'colour_history',
      label: 'What is your recent colour history (box dye, professional colour, bleach, etc.)?',
      type: 'textarea',
    },
    {
      key: 'chemical_treatments',
      label: 'Have you had any chemical treatments (relaxer, keratin, straightening, perm) in the last 6 months?',
      type: 'yes_no',
    },
    {
      key: 'allergies',
      label: 'Have you ever reacted to hair colour or hair products before?',
      type: 'textarea',
    },
    {
      key: 'medications',
      label: 'Are you taking any medications that may affect hair or scalp health?',
      type: 'textarea',
    },
  ],
  nails: [
    {
      key: 'nail_conditions',
      label: 'Do you have any nail or skin conditions on your hands/feet (e.g. fungal infections, open cuts)?',
      type: 'yes_no',
      required: true,
    },
    {
      key: 'recent_treatments',
      label: 'Have you recently had any nail enhancements removed (acrylic, gel, dip)?',
      type: 'yes_no',
    },
    {
      key: 'allergies',
      label: 'Do you have any allergies to nail products (e.g. gel, acrylic, latex, acetone)?',
      type: 'textarea',
    },
    {
      key: 'medications',
      label: 'Are you taking any medications that may affect healing or circulation?',
      type: 'textarea',
    },
  ],
  massage: [
    {
      key: 'injuries_surgeries',
      label: 'Do you have any recent injuries, surgeries, or medical conditions we should know about?',
      type: 'textarea',
      required: true,
    },
    {
      key: 'pain_areas',
      label: 'Where are your main areas of tension or pain?',
      type: 'textarea',
    },
    {
      key: 'medications',
      label: 'Are you taking any medications such as blood thinners, pain medication, or anti-inflammatories?',
      type: 'textarea',
    },
    {
      key: 'pregnancy',
      label: 'Are you pregnant or breastfeeding?',
      type: 'yes_no',
    },
    {
      key: 'preferences',
      label: 'Do you have any pressure or positioning preferences (light, medium, firm, areas to avoid)?',
      type: 'textarea',
    },
  ],
  lashes: [
    {
      key: 'eye_conditions',
      label: 'Do you have any eye conditions or sensitivities (e.g. dry eyes, infections, recent surgery)?',
      type: 'yes_no',
      required: true,
    },
    {
      key: 'contact_lenses',
      label: 'Do you wear contact lenses?',
      type: 'yes_no',
    },
    {
      key: 'allergies',
      label: 'Do you have any allergies to adhesives, tape, or eye products?',
      type: 'textarea',
    },
    {
      key: 'medications',
      label: 'Are you using any eye drops or medications that may affect your eyes or lashes?',
      type: 'textarea',
    },
  ],
  brows: [
    {
      key: 'skin_conditions',
      label: 'Do you have any skin conditions around the brow area (e.g. eczema, dermatitis)?',
      type: 'yes_no',
    },
    {
      key: 'retinoids',
      label: 'Have you used any retinoid or acid-based products near the brow area in the last week?',
      type: 'yes_no',
    },
    {
      key: 'recent_treatments',
      label: 'Have you had any recent brow treatments (tint, lamination, microblading)?',
      type: 'textarea',
    },
    {
      key: 'allergies',
      label: 'Do you have any allergies to tint, dye, or brow products?',
      type: 'textarea',
    },
  ],
  tattoo: [
    {
      key: 'skin_conditions',
      label: 'Do you have any skin conditions in the area to be tattooed (e.g. eczema, psoriasis, infections)?',
      type: 'yes_no',
      required: true,
    },
    {
      key: 'blood_thinners',
      label: 'Are you taking any blood thinners or medications that may affect bleeding or healing?',
      type: 'yes_no',
    },
    {
      key: 'keloid_history',
      label: 'Do you have a history of keloid or raised scarring?',
      type: 'yes_no',
    },
    {
      key: 'allergies',
      label: 'Do you have any allergies to pigment, ink, latex, or topical anaesthetics?',
      type: 'textarea',
    },
    {
      key: 'pregnancy',
      label: 'Are you pregnant or breastfeeding?',
      type: 'yes_no',
    },
  ],
  piercing: [
    {
      key: 'skin_conditions',
      label: 'Do you have any skin conditions or infections in the area to be pierced?',
      type: 'yes_no',
      required: true,
    },
    {
      key: 'blood_thinners',
      label: 'Are you taking any blood thinners or medications that may affect bleeding or healing?',
      type: 'yes_no',
    },
    {
      key: 'allergies',
      label: 'Do you have any allergies to metals (e.g. nickel), latex, or cleaning solutions?',
      type: 'textarea',
    },
    {
      key: 'keloid_history',
      label: 'Do you have a history of keloid or raised scarring?',
      type: 'yes_no',
    },
    {
      key: 'pregnancy',
      label: 'Are you pregnant or breastfeeding?',
      type: 'yes_no',
    },
  ],
  wellness: [
    {
      key: 'medical_history',
      label: 'Please share any relevant medical history or diagnoses that may affect your treatment.',
      type: 'textarea',
      required: true,
    },
    {
      key: 'medications',
      label: 'List any current medications or supplements you are taking.',
      type: 'textarea',
    },
    {
      key: 'allergies',
      label: 'Do you have any allergies or sensitivities?',
      type: 'textarea',
    },
    {
      key: 'pregnancy',
      label: 'Are you pregnant or breastfeeding?',
      type: 'yes_no',
    },
  ],
  general: [
    {
      key: 'medical_history',
      label: 'Do you have any medical conditions we should know about before your treatment?',
      type: 'textarea',
      required: true,
    },
    {
      key: 'medications',
      label: 'Are you currently taking any medications or supplements?',
      type: 'textarea',
    },
    {
      key: 'allergies',
      label: 'Do you have any allergies or sensitivities?',
      type: 'textarea',
    },
    {
      key: 'pregnancy',
      label: 'Are you pregnant or breastfeeding?',
      type: 'yes_no',
    },
    {
      key: 'additional_notes',
      label: 'Is there anything else you would like your therapist to know?',
      type: 'textarea',
    },
  ],
};
