import { useState } from 'react';
import { Link } from 'react-router-dom';
import { visitorApi } from '../api/client';
import Alert from '../components/Alert';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, nowLocalInputValue, toApiDateTime } from '../utils/format';

const EMPTY_FORM = {
  name: '',
  phone: '',
  organization: '',
  hostName: '',
  purpose: '',
  entryTime: nowLocalInputValue(),
};

const PHONE_PATTERN = /^[0-9+\-() ]{5,30}$/;

function validate(values) {
  const errors = {};

  if (!values.name.trim()) errors.name = '请填写姓名';
  else if (values.name.trim().length > 50) errors.name = '姓名不能超过 50 个字符';

  if (!values.phone.trim()) errors.phone = '请填写联系电话';
  else if (!PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = '联系电话格式不正确（可含数字、+、-、括号与空格）';
  }

  if (values.organization.trim().length > 100) errors.organization = '所属单位不能超过 100 个字符';

  if (!values.hostName.trim()) errors.hostName = '请填写被访人';
  else if (values.hostName.trim().length > 50) errors.hostName = '被访人不能超过 50 个字符';

  if (!values.purpose.trim()) errors.purpose = '请填写来访事由';
  else if (values.purpose.trim().length > 200) errors.purpose = '来访事由不能超过 200 个字符';

  return errors;
}

export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const update = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const resetForAnother = () => {
    setForm({ ...EMPTY_FORM, entryTime: nowLocalInputValue() });
    setErrors({});
    setSubmitError('');
    setResult(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      organization: form.organization.trim() || null,
      hostName: form.hostName.trim(),
      purpose: form.purpose.trim(),
    };
    if (form.entryTime) {
      payload.entryTime = toApiDateTime(form.entryTime);
    }

    setSubmitting(true);
    setErrors({});

    try {
      const created = await visitorApi.create(payload);
      setResult(created);
      setForm(EMPTY_FORM);
    } catch (error) {
      if (error.fieldErrors) {
        setErrors(error.fieldErrors);
      }
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="访客登记"
        description="访客进入公司前，请完整登记下列信息。提交后由前台联系被访员工确认。"
      />

      {result ? (
        <section className="panel result-panel" aria-labelledby="register-result-heading">
          <div className="result-panel__head">
            <span className="result-icon" aria-hidden="true">
              ✓
            </span>
            <div>
              <h2 id="register-result-heading">登记成功</h2>
              <p>访客记录已创建，请通知被访人确认后放行。</p>
            </div>
            <StatusBadge status={result.status} />
          </div>

          <dl className="detail-grid result-panel__details">
            <dt>登记编号</dt>
            <dd>#{result.id}</dd>
            <dt>姓名</dt>
            <dd>{result.name}</dd>
            <dt>联系电话</dt>
            <dd>{result.phone}</dd>
            <dt>所属单位</dt>
            <dd>{result.organization || '—'}</dd>
            <dt>被访人</dt>
            <dd>{result.hostName}</dd>
            <dt>来访事由</dt>
            <dd>{result.purpose}</dd>
            <dt>进入时间</dt>
            <dd>{formatDateTime(result.entryTime)}</dd>
            <dt>访客证号</dt>
            <dd>{result.badgeNo || '确认后生成'}</dd>
          </dl>

          <div className="result-panel__actions">
            <button type="button" className="btn btn-primary" onClick={resetForAnother}>
              再登记一位
            </button>
            <Link className="btn btn-secondary" to="/">
              返回前台看板
            </Link>
            <Link className="btn btn-ghost" to="/visitors">
              查看访客记录
            </Link>
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel__body panel__body--form">
            {submitError ? (
              <Alert tone="error" onDismiss={() => setSubmitError('')}>
                {submitError}
              </Alert>
            ) : null}

            <form className="form-grid" onSubmit={handleSubmit} noValidate>
              <div className={`field${errors.name ? ' field--invalid' : ''}`}>
                <label htmlFor="name">
                  姓名 <span className="required">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  className="input"
                  value={form.name}
                  onChange={update('name')}
                  maxLength={50}
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name ? <span className="field-error">{errors.name}</span> : null}
              </div>

              <div className={`field${errors.phone ? ' field--invalid' : ''}`}>
                <label htmlFor="phone">
                  联系电话 <span className="required">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  className="input"
                  value={form.phone}
                  onChange={update('phone')}
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={30}
                  required
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone ? <span className="field-error">{errors.phone}</span> : null}
              </div>

              <div className={`field${errors.organization ? ' field--invalid' : ''}`}>
                <label htmlFor="organization">所属单位</label>
                <input
                  id="organization"
                  name="organization"
                  className="input"
                  value={form.organization}
                  onChange={update('organization')}
                  maxLength={100}
                  autoComplete="organization"
                  aria-invalid={Boolean(errors.organization)}
                />
                {errors.organization ? <span className="field-error">{errors.organization}</span> : null}
              </div>

              <div className={`field${errors.hostName ? ' field--invalid' : ''}`}>
                <label htmlFor="hostName">
                  被访人 <span className="required">*</span>
                </label>
                <input
                  id="hostName"
                  name="hostName"
                  className="input"
                  value={form.hostName}
                  onChange={update('hostName')}
                  maxLength={50}
                  required
                  aria-invalid={Boolean(errors.hostName)}
                />
                {errors.hostName ? <span className="field-error">{errors.hostName}</span> : null}
              </div>

              <div className={`field field--full${errors.purpose ? ' field--invalid' : ''}`}>
                <label htmlFor="purpose">
                  来访事由 <span className="required">*</span>
                </label>
                <input
                  id="purpose"
                  name="purpose"
                  className="input"
                  value={form.purpose}
                  onChange={update('purpose')}
                  maxLength={200}
                  placeholder="如：业务洽谈、设备维修、面试"
                  required
                  aria-invalid={Boolean(errors.purpose)}
                />
                {errors.purpose ? <span className="field-error">{errors.purpose}</span> : null}
              </div>

              <div className={`field${errors.entryTime ? ' field--invalid' : ''}`}>
                <label htmlFor="entryTime">进入时间</label>
                <input
                  id="entryTime"
                  name="entryTime"
                  type="datetime-local"
                  className="input"
                  value={form.entryTime}
                  onChange={update('entryTime')}
                />
                <span className="field-hint">默认当前时间，可按实际情况调整。</span>
                {errors.entryTime ? <span className="field-error">{errors.entryTime}</span> : null}
              </div>

              <div className="form-actions field--full">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? '提交中…' : '提交登记'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForAnother}
                  disabled={submitting}
                >
                  清空表单
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
