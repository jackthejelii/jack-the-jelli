import mongoose, { Schema } from "mongoose";

/**
 * A message sent from `/contact`.
 *
 * The database is the record, not the notification email. Resend's free tier is
 * 100 sends a day shared with account verification, so a quota trip or an
 * outage has to cost the shop a notification, never the customer's message.
 * Nothing reads this collection in the app yet; it is read in Atlas on the rare
 * occasion a send fails.
 */
export interface IContact {
  name: string;
  /** Required, unlike checkout's optional email: it is the only way to reply. */
  email: string;
  phone?: string;
  /**
   * `phone` normalised by `normalizeBdPhone`, so a message can be matched to
   * an order later even though the two were typed in different formats. Absent
   * when no phone was given, or when what was given wasn't a Bangladeshi
   * mobile number.
   */
  phoneKey?: string;
  message: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    phone: { type: String, trim: true, maxlength: 32 },
    phoneKey: { type: String, index: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

// The only way anyone reads this collection: newest first. Nothing filters, so
// a single-key index on the sort field is the whole requirement.
contactSchema.index({ createdAt: -1 });

// Hot-reload guard — without it dev throws OverwriteModelError.
// NOTE: this also means schema edits don't take effect until the dev server
// restarts, since the already-registered model is returned as-is.
const Contact =
  (mongoose.models.Contact as mongoose.Model<IContact>) ||
  mongoose.model<IContact>("Contact", contactSchema);

export default Contact;
