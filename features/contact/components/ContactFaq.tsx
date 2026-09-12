import { Plus } from "lucide-react";
import { sectionHeadingClassName } from "@/features/checkout/lib/checkout-form";

/**
 * The four questions a first-time cash-on-delivery buyer actually asks before
 * ordering, answered here so they never have to become a message.
 *
 * Every answer is checked against something real: payment terms from the
 * product itself, the 64 districts from `features/checkout/lib/delivery.ts`,
 * the all-sales-final policy from /returns and /terms, and tracking from the
 * shipped `/track` route. The delivery window is the one figure that lives
 * nowhere in code, so it is the owner's stated 5 to 7 business days and must
 * be changed here if the courier arrangement changes.
 *
 * Native <details>. An accordion is one of the few widgets the platform
 * already ships correctly, so this needs no client JavaScript and works
 * keyboard-first for free.
 */
const QUESTIONS = [
  {
    question: "How long does delivery take?",
    answer:
      "5 to 7 business days. We call to confirm every order before it is prepared, so keep the phone you ordered with to hand.",
  },
  {
    question: "How do I pay?",
    answer:
      "Cash on delivery, always. You pay the courier when the order reaches you, so nothing leaves your hands before the piece does.",
  },
  {
    question: "Do you deliver outside Dhaka?",
    answer:
      "Yes, to all 64 districts. The delivery fee is set by the district you choose at checkout, and you see it before you confirm.",
  },
  {
    question: "Can I return something?",
    answer:
      "Please check the piece at your door before you pay — if anything is wrong, refuse the delivery and it comes back to us at no cost to you. Once an order has been delivered and paid for, the sale is final.",
  },
  {
    question: "Where is my order?",
    answer:
      "Track it with your order number and the phone number you ordered with. You do not need an account for this.",
  },
];

export default function ContactFaq() {
  return (
    <section aria-labelledby="faq-heading">
      <h2 id="faq-heading" className={sectionHeadingClassName}>
        Common questions
      </h2>

      <div className="mt-2">
        {QUESTIONS.map((item) => (
          <details
            key={item.question}
            className="border-outline-variant/20 group border-b"
          >
            <summary className="hover:text-on-surface-variant focus-visible:outline-foreground ease-editorial text-foreground flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] leading-snug transition-colors duration-(--motion-quick) focus-visible:outline-2 focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus
                aria-hidden="true"
                className="text-on-surface-variant ease-editorial size-4 shrink-0 transition-transform duration-(--motion-quick) group-open:rotate-45"
              />
            </summary>
            <p className="text-on-surface-variant max-w-[65ch] pb-5 text-[15px] leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
