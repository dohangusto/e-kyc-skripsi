import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/colors.dart';
import '../../../../core/constants/dimens.dart';
import '../ekyc_progress_store.dart';
import '../bloc/liveness/liveness_bloc.dart';
import '../bloc/liveness/liveness_event.dart';
import '../bloc/liveness/liveness_state.dart';
import '../widgets/camera_preview_widget.dart';
import '../widgets/ekyc_progress_footer.dart';

class LivenessGesturePage extends StatefulWidget {
  const LivenessGesturePage({super.key});

  @override
  State<LivenessGesturePage> createState() => _LivenessGesturePageState();
}

class _LivenessGesturePageState extends State<LivenessGesturePage>
    with TickerProviderStateMixin {
  Timer? _advanceTimer;
  bool _isCompleted = false;
  late final AnimationController _lockPulseController;
  late final Animation<double> _lockPulse;
  late final AnimationController _checkPulseController;
  late final Animation<double> _checkPulse;

  @override
  void initState() {
    super.initState();
    if (EkycProgressStore.statusOf('liveness') != EkycStepStatus.done) {
      EkycProgressStore.setStatus('liveness', EkycStepStatus.inProgress);
    }
    final bloc = context.read<LivenessBloc>();
    if (bloc.state.status == LivenessStatus.idle) {
      bloc.add(const LivenessSessionStarted());
    }
    _lockPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _lockPulse = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _lockPulseController, curve: Curves.easeInOut),
    );
    _checkPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _checkPulse = Tween<double>(begin: 0.9, end: 1.05).animate(
      CurvedAnimation(parent: _checkPulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _advanceTimer?.cancel();
    _lockPulseController.dispose();
    _checkPulseController.dispose();
    super.dispose();
  }

  void _scheduleAutoAdvance() {
    _advanceTimer?.cancel();
    _advanceTimer = Timer(const Duration(seconds: 2), () {
      if (!mounted) return;
      context.read<LivenessBloc>().add(const LivenessGestureCaptured());
    });
  }

  void _goCompletion() {
    EkycProgressStore.setStatus('liveness', EkycStepStatus.done);
    Navigator.of(context).pop();
  }

  void _showCompletion() {
    if (_isCompleted) return;
    setState(() {
      _isCompleted = true;
    });
    _checkPulseController.repeat(reverse: true);
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        EkycProgressStore.setStatus('liveness', EkycStepStatus.pending);
        return true;
      },
      child: Scaffold(
        backgroundColor: AppColors.surface,
        appBar: AppBar(
          title: const Text('Pengenalan Wajah'),
          centerTitle: false,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              EkycProgressStore.setStatus('liveness', EkycStepStatus.pending);
              Navigator.of(context).maybePop();
            },
          ),
          actions: const [
            Padding(
              padding: EdgeInsets.only(right: Dimens.spacing12),
              child: Icon(Icons.camera_alt_outlined),
            ),
          ],
        ),
        body: SafeArea(
          child: BlocListener<LivenessBloc, LivenessState>(
            listenWhen: (prev, next) =>
                prev.status != next.status &&
                next.status == LivenessStatus.success,
            listener: (_, __) => _showCompletion(),
            child: Column(
              children: [
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(Dimens.spacing16),
                    child: BlocBuilder<LivenessBloc, LivenessState>(
                      builder: (context, state) {
                        if (state.status == LivenessStatus.inProgress) {
                          _scheduleAutoAdvance();
                        } else {
                          _advanceTimer?.cancel();
                        }

                        final total = state.gestures.length;
                        final progress = total == 0
                            ? 0.0
                            : (state.currentIndex + 1) / total;
                        final instruction = _instructionFor(
                          state.currentGesture,
                        );
                        final showDirectionHint = instruction
                            .toLowerCase()
                            .contains('tengok');

                        return Stack(
                          children: [
                            Center(
                              child: ConstrainedBox(
                                constraints: const BoxConstraints(
                                  maxWidth: 520,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    const SizedBox(height: Dimens.spacing16),
                                    Text(
                                      _isCompleted
                                          ? 'Pengenalan wajah berhasil'
                                          : instruction,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: Dimens.spacing24),
                                    _CircularCameraPreview(
                                      progress: _isCompleted ? 1.0 : progress,
                                      showDirectionHint: _isCompleted
                                          ? false
                                          : showDirectionHint,
                                      lockPulse: _lockPulse,
                                    ),
                                    if (_isCompleted) ...[
                                      const SizedBox(height: Dimens.spacing20),
                                      ScaleTransition(
                                        scale: _checkPulse,
                                        child: Container(
                                          width: 64,
                                          height: 64,
                                          decoration: BoxDecoration(
                                            color: AppColors.secondary,
                                            shape: BoxShape.circle,
                                            boxShadow: [
                                              BoxShadow(
                                                color: AppColors.secondary
                                                    .withOpacity(0.35),
                                                blurRadius: 18,
                                                offset: const Offset(0, 6),
                                              ),
                                            ],
                                          ),
                                          child: const Icon(
                                            Icons.check,
                                            color: Colors.white,
                                            size: 36,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: Dimens.spacing8),
                                      const Text(
                                        'Semua instruksi sudah selesai.',
                                        style: TextStyle(
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
                BlocBuilder<LivenessBloc, LivenessState>(
                  builder: (context, state) {
                    final total = state.gestures.length;
                    final current = total == 0 ? 1 : state.currentIndex + 1;
                    return EkycProgressFooter(
                      title: 'Pengenalan Wajah',
                      currentStep: _isCompleted ? total : current,
                      totalSteps: total == 0 ? 3 : total,
                      enableAction: _isCompleted,
                      onAction: _goCompletion,
                    );
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CircularCameraPreview extends StatelessWidget {
  final double progress;
  final bool showDirectionHint;
  final Animation<double> lockPulse;

  const _CircularCameraPreview({
    required this.progress,
    required this.showDirectionHint,
    required this.lockPulse,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      height: 240,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 220,
            height: 220,
            child: CircularProgressIndicator(
              value: progress,
              strokeWidth: 6,
              backgroundColor: AppColors.textSecondary.withOpacity(0.2),
              valueColor: const AlwaysStoppedAnimation<Color>(
                AppColors.primary,
              ),
            ),
          ),
          ClipOval(
            child: SizedBox(
              width: 200,
              height: 200,
              child: const CameraPreviewWidget(
                initialDirection: CameraLensDirection.front,
              ),
            ),
          ),
          if (showDirectionHint)
            Positioned(
              right: 12,
              child: Row(
                children: [
                  _HintBubble(
                    child: const Icon(
                      Icons.face,
                      color: Colors.white,
                      size: 16,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.double_arrow, color: AppColors.primary),
                  const SizedBox(width: 8),
                  ScaleTransition(
                    scale: lockPulse,
                    child: _HintBubble(
                      child: const Icon(
                        Icons.lock,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _HintBubble extends StatelessWidget {
  final Widget child;

  const _HintBubble({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.6),
        shape: BoxShape.circle,
      ),
      child: Center(child: child),
    );
  }
}

String _instructionFor(String gesture) {
  final normalized = gesture.toLowerCase();
  if (normalized.contains('kedip')) {
    return 'Kedipkan matamu';
  }
  if (normalized.contains('tengok') || normalized.contains('kanan')) {
    return 'Tengok kanan';
  }
  if (normalized.contains('senyum') || normalized.contains('buka')) {
    return 'Buka mulutmu';
  }
  return 'Arahkan wajahmu lurus ke kamera';
}
