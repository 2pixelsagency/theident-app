// Real testimonials about The Ident, shown on the Performers / Casting pages.
// Only add quotes from real people who have agreed to be quoted (name + role as they want it shown).
// The section stays hidden while a list is empty — never add made-up quotes.
export type Testimonial = { quote: string; name: string; role: string; picture?: string }

export const PERFORMER_TESTIMONIALS: Testimonial[] = []
export const CASTING_TESTIMONIALS: Testimonial[] = []
