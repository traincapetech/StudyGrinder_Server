import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    linkedinUrl: {
      type: String,
      trim: true,
      default: "",
    },
    course: {
      type: String,
      required: [true, "Course is required"],
      trim: true,
    },
    courseCode: {
      type: String,
      trim: true,
      default: "",
    },
    telegram: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      trim: true,
      default: "Website Form",
    },
    ip: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    emailError: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index for query performance on admin dashboards or exports
registrationSchema.index({ createdAt: -1 });
registrationSchema.index({ email: 1 });

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;
