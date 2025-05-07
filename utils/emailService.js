import dotenv from 'dotenv';
import nodemailer from 'nodemailer';


dotenv.config();
const sendMail = async (to, subject, htmlContent) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent, 
    };
  
    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${to}`);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
    }
  };
  

export default sendMail;










// import dotenv from 'dotenv';
// import nodemailer from 'nodemailer';


// dotenv.config();

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,       
//     pass: process.env.EMAIL_PASSWORD,    
//   },
// });

// const sendMail = async (to, subject, text) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to,
//     subject,
//     text,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     console.log(`📧 Email sent to ${to}`);
//   } catch (error) {
//     console.error('❌ Failed to send email:', error);
//   }
// };

// export default sendMail;
