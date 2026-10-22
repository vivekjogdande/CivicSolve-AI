import { useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown, Upload, X } from 'lucide-react';
import { Alert, ButtonLoading, Field, Modal } from './ui';
import { AiAdvisory, BeforeAfter, Deadline } from './ComplaintParts';
import { useToast } from '../context/ToastContext';

/**
 * The citizen's verification step: before/after photos plus "Yes, it's fixed" / "No, still a problem".
 * `confirm()` and `reject(formData)` are supplied by the page (account or anonymous token flow)
 * and return the updated complaint.
 */
export default function DecisionPanel({ complaint, confirm, reject, onUpdated }) {
  const toast = useToast();
  const attempt = [...(complaint.resolutionAttempts || [])].reverse().find((a) => !a.decision && !a.closedUnconfirmedAt);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [err, setErr] = useState('');
  const input = useRef(null);

  if (!attempt) return null;
  const canRespond = complaint.canRespond;

  const doConfirm = async () => {
    setBusy(true);
    try { onUpdated(await confirm()); toast.success('Thank you. The complaint is now marked as resolved.'); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const pick = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type) && !/\.heic$/i.test(f.name)) { setErr('Please choose a photograph (JPG, PNG, WebP or HEIC).'); return; }
    if (f.size > 10 * 1024 * 1024) { setErr('The photograph is larger than 10 MB.'); return; }
    setErr('');
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const doReject = async (ev) => {
    ev.preventDefault();
    if (reason.trim().length < 10) { setErr('Please explain what is still wrong (at least 10 characters).'); return; }
    if (!file) { setErr('Please attach a new photograph showing the current state.'); return; }
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('reason', reason.trim());
      fd.append('media', file);
      const updated = await reject(fd);
      setOpen(false);
      onUpdated(updated);
      toast.success('Your response was recorded. The case is reopened and sent to a senior officer.');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="card stack" style={{ borderColor: 'var(--teal-600)', borderWidth: 2 }}>
      <div className="row between"><h3 style={{ margin: 0 }}>Has the civic problem been properly resolved?</h3><Deadline deadline={complaint.confirmationDeadline} /></div>
      <BeforeAfter complaint={complaint} attempt={attempt} />
      <AiAdvisory ai={attempt.ai} />
      {attempt.validationStatus === 'FLAGGED' && <Alert type="warn">The evidence photo’s metadata could not be fully verified, so reviewers have flagged it. Please judge the photo by what you can see.</Alert>}
      {canRespond ? (
        <div className="row">
          <ButtonLoading type="button" className="btn btn-primary btn-lg" loading={busy} onClick={doConfirm}><ThumbsUp size={18} /> Yes, it’s fixed</ButtonLoading>
          <button type="button" className="btn btn-danger btn-lg" disabled={busy} onClick={() => { setErr(''); setOpen(true); }}><ThumbsDown size={18} /> No, still a problem</button>
        </div>
      ) : <Alert type="warn">The confirmation deadline has passed, so this complaint can no longer be answered.</Alert>}
      <p className="small muted" style={{ margin: 0 }}>If you do not respond before the deadline the case closes as <em>unconfirmed</em>, which is not counted as a successful resolution.</p>

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="What is still wrong?">
        <form onSubmit={doReject} noValidate>
          {err && <Alert type="error">{err}</Alert>}
          <Field label="Explain the problem" htmlFor="reason" required><textarea id="reason" className="textarea" rows={4} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Debris and garbage are still scattered near the bins; only partial cleanup was completed." /></Field>
          <Field label="New photograph" hint="Required: show how the site looks now" required>
            {preview ? (
              <div className="previews" style={{ gridTemplateColumns: '160px' }}><div className="preview"><img src={preview} alt="New photograph preview" /><button type="button" aria-label="Remove photograph" onClick={() => { URL.revokeObjectURL(preview); setPreview(''); setFile(null); }}><X size={14} /></button></div></div>
            ) : <button type="button" className="dropzone" style={{ width: '100%', font: 'inherit' }} onClick={() => input.current.click()}><Upload size={22} /><div>Choose a photograph</div></button>}
            <input ref={input} type="file" accept="image/*,.heic" hidden onChange={pick} />
          </Field>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
            <ButtonLoading type="submit" loading={busy} className="btn btn-danger">Reopen complaint</ButtonLoading>
          </div>
        </form>
      </Modal>
    </div>
  );
}
