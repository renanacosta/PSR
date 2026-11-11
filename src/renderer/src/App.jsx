import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import {
  Activity,
  ArrowDownToLine,
  Camera,
  Check,
  CircleHelp,
  Clock3,
  Eye,
  FileImage,
  MousePointer2,
  Pause,
  Play,
  ShieldCheck,
  Square,
  Trash2,
} from 'lucide-react'

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function createReport(steps) {
  const imageFiles = steps.map((step, index) => `capturas/etapa-${String(index + 1).padStart(3, '0')}.png`)
  const contents = steps.map((step, index) => {
    const name = step.name?.trim() || `Etapa ${index + 1}`
    const note = step.note.trim() ? `<p class="note">${escapeHtml(step.note.trim())}</p>` : ''
    const date = new Date(step.capturedAt).toLocaleString('pt-BR')
    return `<article><h2>${escapeHtml(name)}</h2><p class="meta">Etapa ${index + 1} · ${date} · Clique ${step.click.button}</p><div class="shot"><img src="${imageFiles[index]}" alt="Captura: ${escapeHtml(name)}"><i style="left:${step.click.x * 100}%;top:${step.click.y * 100}%"></i></div>${note}</article>`
  }).join('')

  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Relatório de etapas</title><style>*{box-sizing:border-box}body{max-width:980px;margin:48px auto;padding:0 24px;color:#202523;font:16px/1.5 Arial,sans-serif}h1{font-size:30px;margin-bottom:4px}header{border-bottom:1px solid #dfe3dd;padding-bottom:24px;margin-bottom:34px}.meta{color:#707973;font-size:13px}.shot{position:relative;background:#e8ebe6;border-radius:4px;overflow:hidden}.shot img{width:100%;display:block}.shot i{position:absolute;width:18px;height:18px;margin:-9px;border:3px solid white;border-radius:50%;background:#e34e38;box-shadow:0 1px 5px #0008}article{margin:0 0 42px}h2{font-size:20px;margin:0}</style><header><h1>Relatório de etapas</h1><p class="meta">${steps.length} etapas · Exportado em ${new Date().toLocaleString('pt-BR')}</p></header>${contents}</html>`
}

export default function App() {
  const [steps, setSteps] = useState([])
  const [recording, setRecording] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [notice, setNotice] = useState('')
  const selectedStep = steps.find((step) => step.id === selectedId) ?? steps.at(-1)
  const selectedImageSize = selectedStep?.imageSize ?? selectedStep?.display
  const screenshotAspectRatio = selectedImageSize
    ? selectedImageSize.width / selectedImageSize.height
    : 1

  useEffect(() => {
    const removeStepListener = window.psr.onStep((step) => {
      setSteps((current) => [...current, { ...step, name: `Etapa ${step.number ?? current.length + 1}` }])
      setSelectedId(step.id)
    })
    const removeStatusListener = window.psr.onStatus(setRecording)
    const removeErrorListener = window.psr.onError((message) => setNotice(`Não foi possível capturar a tela: ${message}`))
    return () => {
      removeStepListener()
      removeStatusListener()
      removeErrorListener()
    }
  }, [])

  async function startRecording() {
    setSteps([])
    setSelectedId(null)
    setNotice('')
    setHasStarted(true)
    setFinalized(false)
    await window.psr.startRecording()
  }

  function startNewRecording() {
    if (steps.length > 0 && !window.confirm('As etapas desta gravação serão apagadas. Exporte o relatório antes se quiser guardá-las. Iniciar outra gravação?')) return
    startRecording()
  }

  async function togglePause() {
    if (recording) await window.psr.pauseRecording()
    else await window.psr.resumeRecording()
  }

  async function stopRecording() {
    await window.psr.stopRecording()
    setFinalized(true)
  }

  function updateNote(id, note) {
    setSteps((current) => current.map((step) => step.id === id ? { ...step, note } : step))
  }

  function updateName(id, name) {
    setSteps((current) => current.map((step) => step.id === id ? { ...step, name } : step))
  }

  function removeStep(id) {
    setSteps((current) => current.filter((step) => step.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  async function exportReport() {
    const zip = new JSZip()
    zip.file('relatorio.html', createReport(steps))
    steps.forEach((step, index) => {
      const base64 = step.image.substring(step.image.indexOf(',') + 1)
      zip.file(`capturas/etapa-${String(index + 1).padStart(3, '0')}.png`, base64, { base64: true })
    })
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `relatorio-etapas-${new Date().toISOString().slice(0, 10)}.zip`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Relatório exportado com sucesso.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="PSR início">
          <span className="brand-mark"><Activity size={19} strokeWidth={2.5} /></span>
          <span>psr<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-meta"><span className="local-indicator" /> Sessão local <span className="topbar-divider" /> Windows</div>
        <button className="icon-button help-button" title="Sobre o PSR" aria-label="Sobre o PSR" onClick={() => setNotice('O PSR captura a tela e os cliques enquanto a gravação está ativa. Nenhuma tecla digitada é registrada.')}><CircleHelp size={18} /></button>
      </header>

      <main className="workspace">
        <section className="intro-row">
          <div>
            <p className="eyebrow">DOCUMENTAÇÃO DE FLUXOS</p>
            <h1>Gravador de etapas</h1>
            <p className="subtitle">Registre o que acontece na tela. Revise e compartilhe quando terminar.</p>
          </div>
          <div className={`record-state ${recording ? 'is-recording' : ''}`}>
            <span className="state-dot" />{recording ? 'Gravando' : finalized ? 'Finalizada' : hasStarted ? 'Pausado' : 'Pronto para gravar'}
          </div>
        </section>

        <section className="control-bar" aria-label="Controles de gravação">
          <div className="controls-primary">
            {!hasStarted ? (
              <button className="button button-record" onClick={startRecording}><span className="record-icon" />Iniciar gravação</button>
            ) : finalized ? (
              <button className="button button-record" onClick={startNewRecording}><span className="record-icon" />Nova gravação</button>
            ) : (
              <>
                <button className="button button-record" onClick={togglePause}>
                  {recording ? <><Pause size={16} fill="currentColor" />Pausar</> : <><Play size={16} fill="currentColor" />Continuar</>}
                </button>
                <button className="button button-stop" onClick={stopRecording}><Square size={14} fill="currentColor" />Finalizar</button>
              </>
            )}
          </div>
          <div className="session-stats">
            <span><FileImage size={16} />{steps.length} {steps.length === 1 ? 'etapa' : 'etapas'}</span>
            {steps.length > 0 && <button className="button button-export" onClick={exportReport}><ArrowDownToLine size={16} />Exportar ZIP</button>}
          </div>
        </section>

        <section className="privacy-strip">
          <ShieldCheck size={17} />
          <span><strong>Privacidade sob seu controle.</strong> Capturas só acontecem durante a gravação. Teclas digitadas não são registradas.</span>
          {recording && <span className="live-label"><span /> AO VIVO</span>}
        </section>

        {notice && <div className="notice" role="status"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso">×</button></div>}

        <section className="content-grid">
          <aside className="steps-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">LINHA DO TEMPO</p><h2>Etapas capturadas</h2></div>
              <span className="step-count">{String(steps.length).padStart(2, '0')}</span>
            </div>
            {steps.length === 0 ? (
              <div className="empty-steps">
                <div className="empty-icon"><MousePointer2 size={20} /></div>
                <p className="empty-title">Nenhuma etapa ainda</p>
                <p>Inicie a gravação e use outro aplicativo. Cada clique será registrado com uma captura de tela.</p>
              </div>
            ) : (
              <div className="steps-list">
                {steps.map((step, index) => (
                  <button className={`step-row ${selectedStep?.id === step.id ? 'selected' : ''}`} key={step.id} onClick={() => setSelectedId(step.id)}>
                    <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                    <img src={step.image} alt="" />
                    <span className="step-copy"><strong>{step.name || `Etapa ${index + 1}`}</strong><small>{new Date(step.capturedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · clique {step.click.button}</small></span>
                    <Eye size={16} className="step-eye" />
                  </button>
                ))}
              </div>
            )}
            <div className="timeline-foot"><Clock3 size={14} /> Capturas salvas apenas nesta sessão</div>
          </aside>

          <section className="detail-panel">
            <div className="panel-heading detail-heading">
              <div><p className="eyebrow">REVISÃO</p><h2>{selectedStep ? `Etapa ${String(steps.indexOf(selectedStep) + 1).padStart(2, '0')}` : 'Prévia da captura'}</h2></div>
              {selectedStep && <button className="icon-button delete-button" title="Excluir etapa" aria-label="Excluir etapa" onClick={() => removeStep(selectedStep.id)}><Trash2 size={17} /></button>}
            </div>
            {selectedStep ? (
              <>
                <div className="screenshot-frame">
                  <div
                    className="screenshot-content"
                    style={{
                      aspectRatio: `${selectedImageSize.width} / ${selectedImageSize.height}`,
                      width: `min(100%, ${333 * screenshotAspectRatio}px)`,
                    }}
                  >
                    <img className="screenshot-image" src={selectedStep.image} alt={`Captura da etapa ${steps.indexOf(selectedStep) + 1}`} />
                    <span className="click-marker" style={{ left: `${selectedStep.click.x * 100}%`, top: `${selectedStep.click.y * 100}%` }}><MousePointer2 size={17} fill="white" /></span>
                  </div>
                  <span className="capture-label"><Camera size={13} /> CAPTURA DE TELA</span>
                </div>
                <div className="capture-meta"><span>Clique {selectedStep.click.button}</span><span>{new Date(selectedStep.capturedAt).toLocaleString('pt-BR')}</span></div>
                <label className="note-label" htmlFor="step-name">Nome da etapa</label>
                <input id="step-name" className="name-input" value={selectedStep.name ?? ''} onChange={(event) => updateName(selectedStep.id, event.target.value)} placeholder={`Etapa ${steps.indexOf(selectedStep) + 1}`} />
                <label className="note-label" htmlFor="step-note">Anotação <span>OPCIONAL</span></label>
                <textarea id="step-note" className="note-input" value={selectedStep.note} onChange={(event) => updateNote(selectedStep.id, event.target.value)} placeholder="Descreva o que acontece nesta etapa..." rows="3" />
              </>
            ) : (
              <div className="preview-placeholder">
                <div className="preview-crosshair"><span /><span /></div>
                <div className="placeholder-copy"><Camera size={18} /><p>A prévia da etapa aparece aqui</p><small>Selecione uma etapa na linha do tempo para revisar.</small></div>
                <div className="placeholder-corners"><i /><i /><i /><i /></div>
              </div>
            )}
          </section>
        </section>

        <footer className="app-footer"><span><span className="footer-mark" />PSR <span className="footer-version">0.1.0</span></span><span>As capturas permanecem neste computador até você exportá-las.</span></footer>
      </main>
    </div>
  )
}