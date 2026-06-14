return (
    <div style={{ padding: '24px 16px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {showBack ? (
            <button onClick={back} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px', padding: 0, marginBottom: '3px', color: '#888', fontSize: '12px', WebkitTapHighlightColor: 'transparent' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
              Back
            </button>
          ) : (
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 3px' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          )}
          <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', color: '#0c2520', margin: 0, fontWeight: 500, lineHeight: 1.2 }}>{title}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Bell */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button onClick={() => { setBellOpen(!bellOpen); setMenuOpen(false) }} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'white', border: '1px solid #e6e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.7" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              {notes.length > 0 && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', border: '1.5px solid white' }} />}
            </button>
            {bellOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '280px', background: 'white', borderRadius: '16px', border: '1px solid #ebe8e1', boxShadow: '0 12px 36px rgba(12,37,32,0.14)', zIndex: 400, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0ede5' }}>
                  <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: 0 }}>Notifications</p>
                </div>
                {notes.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center' }}><p style={{ fontSize: '13px', color: '#999', margin: 0 }}>You're all caught up</p></div>
                ) : notes.slice(0, 6).map(n => (
                  <div key={n.id} onClick={() => openNote(n)} style={{ padding: '11px 16px', borderBottom: '1px solid #f0ede5', cursor: 'pointer' }}>
                    {n.title && <p style={{ fontSize: '12px', color: '#92a89c', margin: '0 0 2px', fontWeight: 600 }}>{n.title}</p>}
                    <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avatar dropdown */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => { setMenuOpen(!menuOpen); setBellOpen(false) }} style={{ width: '44px', height: '44px', borderRadius: '50%', background: profile?.picture_url ? 'url(' + profile.picture_url + ') center/cover' : '#e8efea', backgroundSize: 'cover', border: '2px solid #e6e2d9', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
              {!profile?.picture_url && <span style={{ fontFamily: "'ITC Symbol',Georgia,serif", fontWeight: 500, color: '#92d7af', fontSize: '17px' }}>{(profile?.first_name || '?')[0]?.toUpperCase()}</span>}
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '200px', background: 'white', borderRadius: '16px', border: '1px solid #ebe8e1', boxShadow: '0 12px 36px rgba(12,37,32,0.14)', zIndex: 400, overflow: 'hidden' }}>
                {menuItems.map(item => (
                  <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '13px 16px', borderBottom: '1px solid #f0ede5', fontSize: '14px', color: '#0c2520', fontWeight: 500, cursor: 'pointer' }}>{item.label}</div>
                  </Link>
                ))}
                <div onClick={logout} style={{ padding: '13px 16px', fontSize: '14px', color: '#c0392b', fontWeight: 500, cursor: 'pointer' }}>Log out</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
