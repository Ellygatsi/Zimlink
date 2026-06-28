def zimlink_email_template(code: str, purpose: str = "register") -> str:
    title = "Verify your ZimLink account"
    message = "Use this 6-digit code to verify your email address."

    if purpose == "password_reset":
        title = "Reset your ZimLink password"
        message = "Use this 6-digit code to reset your password."

    return f"""
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
        <div style="max-width:520px;margin:30px auto;background:white;border:2px solid #000;border-radius:18px;overflow:hidden;">

          <div style="height:6px;display:flex;">
            <div style="background:#009639;width:25%;"></div>
            <div style="background:#FFCD00;width:25%;"></div>
            <div style="background:#DE2010;width:25%;"></div>
            <div style="background:#000;width:25%;"></div>
          </div>

          <div style="padding:32px;text-align:center;">
            <h1 style="margin:0;font-size:34px;font-weight:900;letter-spacing:-1px;color:#000;">
              ZIM<span style="color:#FFCD00;">·</span>LINK
            </h1>

            <p style="margin:8px 0 28px;font-size:11px;font-weight:bold;letter-spacing:2px;color:#555;">
              CONNECTING ZIMBABWE. CONNECTING YOU.
            </p>

            <h2 style="margin:0 0 12px;font-size:24px;color:#000;">
              {title}
            </h2>

            <p style="font-size:15px;color:#555;line-height:1.5;">
              {message}
            </p>

            <div style="margin:28px auto;padding:20px;background:#009639;color:white;border-radius:14px;border:2px solid #000;font-size:38px;font-weight:900;letter-spacing:8px;">
              {code}
            </div>

            <p style="font-size:13px;color:#666;">
              This code expires in 15 minutes.
            </p>

            <p style="font-size:12px;color:#999;margin-top:26px;">
              If you did not request this, you can safely ignore this email.
            </p>
          </div>

          <div style="background:#000;color:white;text-align:center;padding:14px;font-size:12px;">
            © ZimLink
          </div>
        </div>
      </body>
    </html>
    """