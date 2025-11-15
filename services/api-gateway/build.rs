use std::env;
use std::path::PathBuf;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR")?);
    let proto = manifest_dir
        .join("../../shared/proto/ekyc/v1/ekyc.proto")
        .canonicalize()?;
    let include_dir = manifest_dir.join("../../shared/proto").canonicalize()?;

    println!("cargo:rerun-if-changed={}", proto.display());
    tonic_build::configure()
        .build_server(false)
        .compile(&[proto], &[include_dir])?;

    Ok(())
}
