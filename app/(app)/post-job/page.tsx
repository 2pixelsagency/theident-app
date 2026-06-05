<h2 style={sectionStyle}>How to apply</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Application method</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" onClick={() => setApplicationMethod('in_app')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: applicationMethod === 'in_app' ? '2px solid #0c2520' : '1px solid #e0ddd5', background: applicationMethod === 'in_app' ? '#e8efea' : 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: applicationMethod === 'in_app' ? 600 : 400, color: '#0c2520', textAlign: 'center' }}>
                  Apply in app
                  <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 400 }}>Talent applies through The Ident</p>
                </button>
                <button type="button" onClick={() => setApplicationMethod('email')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: applicationMethod === 'email' ? '2px solid #0c2520' : '1px solid #e0ddd5', background: applicationMethod === 'email' ? '#e8efea' : 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: applicationMethod === 'email' ? 600 : 400, color: '#0c2520', textAlign: 'center' }}>
                  Apply via email
                  <p style={{ fontSize: '11px', color: '#888', margin: '4px 0 0', fontWeight: 400 }}>Opens their email client</p>
                </button>
              </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#0c2520', margin: '0 0 4px' }}>Require NDA</p>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Talent must sign before applying</p>
              </div>
              <div className={'toggle-switch' + (requiresNda ? ' on' : '')} onClick={() => setRequiresNda(!requiresNda)}>
                <div className="toggle-knob" />
              </div>
            </div>

            {requiresNda && (
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>NDA text</label>
                <textarea value={ndaText} onChange={e => setNdaText(e.target.value)} placeholder="Paste your NDA terms here..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Apply Email <span style={{ color: '#c44' }}>*</span></label>
