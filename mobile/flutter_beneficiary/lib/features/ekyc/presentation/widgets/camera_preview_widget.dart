import 'dart:io' show Platform;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../../core/constants/colors.dart';

class CameraPreviewWidget extends StatefulWidget {
  final String? label;
  final Widget? overlay;
  final CameraLensDirection initialDirection;

  const CameraPreviewWidget({
    super.key,
    this.label,
    this.overlay,
    this.initialDirection = CameraLensDirection.back,
  });

  @override
  State<CameraPreviewWidget> createState() => _CameraPreviewWidgetState();
}

class _CameraPreviewWidgetState extends State<CameraPreviewWidget>
    with WidgetsBindingObserver {
  CameraController? _controller;
  bool _isLoading = false;
  String? _error;
  PermissionStatus? _permissionStatus;
  List<CameraDescription> _availableCameras = [];
  CameraLensDirection? _currentDirection;

  bool get _isPermissionDenied {
    if (kIsWeb) return false;
    final status = _permissionStatus;
    if (status == null) return false;
    return !status.isGranted;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _currentDirection = widget.initialDirection;
    _initializeCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      controller.dispose();
      setState(() {
        _controller = null;
      });
    } else if (state == AppLifecycleState.resumed) {
      _initializeCamera();
    }
  }

  Future<void> _initializeCamera({
    CameraLensDirection? preferredDirection,
  }) async {
    if (_isLoading) return;

    final isSwitching = preferredDirection != null && _controller != null;
    if (isSwitching) {
      try {
        await _controller?.dispose();
      } catch (_) {}
      _controller = null;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final isIOS = !kIsWeb && Platform.isIOS;

      if (!kIsWeb && !isIOS) {
        var status = _permissionStatus ?? await Permission.camera.status;
        if (!status.isGranted) {
          status = await Permission.camera.request();
        }
        if (!mounted) return;
        _permissionStatus = status;
        if (!status.isGranted) {
          setState(() {
            _isLoading = false;
          });
          return;
        }
      }

      if (_availableCameras.isEmpty) {
        try {
          _availableCameras = await availableCameras();
        } on CameraException catch (e) {
          if (!mounted) return;
          if (e.code == 'CameraAccessDenied' ||
              e.code == 'CameraAccessDeniedWithoutPrompt') {
            setState(() {
              _permissionStatus = PermissionStatus.denied;
              _isLoading = false;
            });
            return;
          }
          setState(() {
            _error =
                'Kamera tidak tersedia di perangkat ini. Coba perangkat fisik atau cek pengaturan.';
            _isLoading = false;
          });
          return;
        }
      }

      if (!mounted) return;
      if (_availableCameras.isEmpty) {
        setState(() {
          _error =
              'Kamera tidak tersedia di perangkat ini (mungkin simulator).';
          _isLoading = false;
        });
        return;
      }

      final targetDirection =
          preferredDirection ?? _currentDirection ?? widget.initialDirection;
      final selectedCamera = _pickCamera(targetDirection);

      final controller = CameraController(
        selectedCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await controller.initialize();

      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _controller = controller;
        _currentDirection = selectedCamera.lensDirection;
        _permissionStatus = PermissionStatus.granted;
        _isLoading = false;
      });
    } catch (_) {
      setState(() {
        _error =
            'Gagal membuka kamera. Pastikan izin sudah diberikan atau gunakan perangkat lain.';
        _isLoading = false;
      });
    }
  }

  CameraDescription _pickCamera(CameraLensDirection desired) {
    return _availableCameras.firstWhere(
      (item) => item.lensDirection == desired,
      orElse: () => _availableCameras.first,
    );
  }

  Future<void> _switchCamera() async {
    if (_isLoading || _availableCameras.length < 2) return;

    final currentIndex = _availableCameras.indexWhere(
      (c) => c.lensDirection == _currentDirection,
    );
    final nextIndex = currentIndex == -1
        ? 0
        : (currentIndex + 1) % _availableCameras.length;
    final nextDirection = _availableCameras[nextIndex].lensDirection;

    await _initializeCamera(preferredDirection: nextDirection);
  }

  Future<void> _handlePermissionAction() async {
    if (kIsWeb) {
      await _initializeCamera();
      return;
    }

    final isIOS = Platform.isIOS;
    if (isIOS) {
      // Biarkan plugin camera memicu prompt iOS.
      await _initializeCamera();
      return;
    }

    var status = await Permission.camera.request();
    if (!mounted) return;
    _permissionStatus = status;

    if (status.isGranted) {
      await _initializeCamera();
      return;
    }

    if (status.isPermanentlyDenied) {
      await openAppSettings();
      return;
    }

    setState(() {
      _isLoading = false;
    });
  }

  Widget _buildLabel() {
    if (widget.label == null) return const SizedBox.shrink();

    return Align(
      alignment: Alignment.bottomCenter,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.black54,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            widget.label!,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPermissionOverlay() {
    final status = _permissionStatus;
    final isPermanent = status?.isPermanentlyDenied ?? false;
    final isRestricted = status?.isRestricted ?? false;
    final label = isPermanent ? 'Buka Pengaturan' : 'Izinkan Kamera';
    final message = isPermanent
        ? 'Izin kamera diblokir. Buka pengaturan untuk mengizinkan kamera.'
        : isRestricted
        ? 'Akses kamera dibatasi (simulator atau kebijakan perangkat). Coba buka pengaturan atau gunakan perangkat fisik.'
        : 'Kami membutuhkan izin kamera untuk menampilkan pratinjau.';

    return Container(
      color: Colors.black54,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.camera_alt_outlined, color: Colors.white70),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                onPressed: _handlePermissionAction,
                child: Text(label),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorOverlay() {
    return Container(
      color: Colors.black54,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.white70),
              const SizedBox(height: 8),
              Text(
                _error ?? 'Terjadi kesalahan kamera.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                ),
                onPressed: _handlePermissionAction,
                child: const Text('Coba lagi'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;

    return AspectRatio(
      aspectRatio: 3 / 4,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (controller != null && controller.value.isInitialized)
              CameraPreview(controller)
            else
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1F2937)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Center(
                  child: Text(
                    'Mempersiapkan kamera...',
                    style: TextStyle(color: Colors.white70),
                  ),
                ),
              ),
            if (widget.overlay != null)
              Positioned.fill(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: widget.overlay,
                ),
              ),
            _buildLabel(),
            if (_availableCameras.length > 1)
              Positioned(
                right: 12,
                bottom: 12,
                child: FloatingActionButton.small(
                  heroTag: 'switch_camera_${widget.hashCode}',
                  backgroundColor: Colors.black87,
                  foregroundColor: Colors.white,
                  onPressed: _isLoading ? null : _switchCamera,
                  child: const Icon(Icons.cameraswitch_rounded),
                ),
              ),
            if (_isPermissionDenied) _buildPermissionOverlay(),
            if (_error != null) _buildErrorOverlay(),
            if (_isLoading)
              Container(
                color: Colors.black26,
                child: const Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
